import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { map } from 'rxjs/operators';

import { HowToOrderService } from '../services/how-to-order.service';
import { CM_PER_INCH, COLOR_LIST_HARD_CAP, OrderCategory, OrderQuestion } from '../models/order-categories.model';
import {
  LovebugOrderSubmissionPayload,
  LovebugUploadedFile,
  OrderSubmissionService
} from '../services/order-submission.service';
import { OrderPricingService, PricingBreakdown } from '../services/order-pricing.service';

type ActiveModal = 'confirm' | 'success' | null;

@Component({
  selector: 'app-category-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './category-page.component.html',
  styleUrl: './category-page.component.scss',
})
export class CategoryPageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly howToOrderService = inject(HowToOrderService);
  private readonly fb = inject(FormBuilder);
  private readonly orderSubmissionService = inject(OrderSubmissionService);
  private readonly orderPricingService = inject(OrderPricingService);

  protected confirmationEmailSent = false;
  protected readonly minCompletionDate = this.computeMinCompletionDate();
  protected readonly minCompletionDateLabel = this.formatMinCompletionDate(this.minCompletionDate);

  protected isSubmitting = false;
  protected submitError = '';
  protected submittedOrderId = '';
  protected submittedEmailAddress = '';
  protected activeModal: ActiveModal = null;

  protected paymentMethod: 'etransfer' | 'cash' | null = null;
  protected paymentMethodError = false;
  protected submittedPaymentMethod: 'etransfer' | 'cash' | null = null;

  protected selectedFiles: File[] = [];
  protected fileUploadError = '';

  private readonly maxFileCount = 5;
  private readonly maxFileSizeBytes = 5 * 1024 * 1024;

  private readonly slug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')),
    { initialValue: '' }
  );

  private readonly categories = toSignal(
    this.howToOrderService.getCategories(),
    { initialValue: [] as OrderCategory[] }
  );

  private readonly loading = toSignal(
    this.howToOrderService.getLoading(),
    { initialValue: true }
  );

  protected readonly category = computed<OrderCategory | undefined>(() =>
    this.categories().find((item) => item.slug === this.slug())
  );

  protected readonly isLoading = computed(() => this.loading());

  protected readonly form = this.fb.group({
    fullName: ['', Validators.required],
    instagramUsername: [''],
    emailAddress: ['', [Validators.required, Validators.email]],
    isPickup: [false],
    isDelivery: [false],
    shippingAddress: [''],
    isGift: [null as boolean | null, Validators.required],
    preferredCompletionDate: [
      '',
      [Validators.required, this.minLeadTimeValidator()]
    ],
    budgetRange: [''],
    referenceImages: [''],
    allergies: [''],
    agreementYes: [false, Validators.requiredTrue],
    answers: this.fb.group({})
  }, { validators: [this.receivalMethodValidator()] });

  private readonly answersValue = toSignal(
    this.form.get('answers')!.valueChanges,
    { initialValue: this.form.get('answers')!.value as Record<string, unknown> }
  );

  protected readonly isDeliverySignal = toSignal(
    this.form.get('isDelivery')!.valueChanges,
    { initialValue: this.form.get('isDelivery')!.value as boolean }
  );

  protected readonly pricing = computed<PricingBreakdown>(() =>
    this.orderPricingService.calculate(this.category(), this.answersValue())
  );

  constructor() {
    effect(() => {
      const category = this.category();
      const answersGroup = this.answersGroup;

      Object.keys(answersGroup.controls).forEach((key) => {
        answersGroup.removeControl(key);
      });

      if (!category) {
        return;
      }

      category.questions.forEach((question) => {
        if (question.type === 'color-list') {
          const colorsArray = this.fb.array(
            [this.fb.control('')],
            question.required ? [this.minFilledEntriesValidator(1)] : []
          );
          answersGroup.addControl(question.key, colorsArray);
          return;
        }

        if (question.type === 'measurement') {
          const measurementGroup = this.fb.group({
            value: [
              null as number | null,
              question.required ? [Validators.required, Validators.min(0.1)] : [Validators.min(0.1)]
            ],
            unit: ['cm' as 'cm' | 'in', Validators.required]
          });
          answersGroup.addControl(question.key, measurementGroup);
          return;
        }

        const validators = question.required ? [Validators.required] : [];
        answersGroup.addControl(
          question.key,
          new FormControl('', validators)
        );
      });
    });

    effect(() => {
      const isDelivery = this.isDeliverySignal();
      const shippingAddressControl = this.form.get('shippingAddress')!;

      if (isDelivery) {
        shippingAddressControl.addValidators(Validators.required);
      } else {
        shippingAddressControl.removeValidators(Validators.required);
      }

      shippingAddressControl.updateValueAndValidity({ emitEvent: false });
    });
  }

  private minFilledEntriesValidator(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const arr = control as FormArray;
      const filled = arr.controls.filter(
        (c) => String(c.value ?? '').trim().length > 0
      ).length;

      return filled >= min ? null : { minFilled: true };
    };
  }

  /** Earliest allowed completion date: 14 days from today, as a local YYYY-MM-DD string. */
  private computeMinCompletionDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 14);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private formatMinCompletionDate(isoDate: string): string {
    const [year, month, day] = isoDate.split('-').map(Number);

    return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  private minLeadTimeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      if (!value) {
        return null;
      }

      // Date inputs yield YYYY-MM-DD, which compares correctly as plain text.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(value).getTime())) {
        return { invalidDate: true };
      }

      return value < this.minCompletionDate ? { tooSoon: true } : null;
    };
  }

  private receivalMethodValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const isPickup = control.get('isPickup')?.value;
      const isDelivery = control.get('isDelivery')?.value;

      return isPickup || isDelivery ? null : { receivalMethodRequired: true };
    };
  }

  ngOnDestroy(): void {
    document.body.classList.remove('modal-open');
  }

  private setActiveModal(modal: ActiveModal): void {
    this.activeModal = modal;
    document.body.classList.toggle('modal-open', modal !== null);
  }

  @HostListener('document:keydown', ['$event'])
  protected handleDocumentKeydown(event: KeyboardEvent): void {
    if (!this.activeModal) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeModal();
      return;
    }

    if (event.key === 'Enter') {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();

      if (tagName === 'textarea') {
        return;
      }

      event.preventDefault();

      if (this.activeModal === 'confirm' && !this.isSubmitting) {
        this.onConfirmYesClick();
        return;
      }

      if (this.activeModal === 'success') {
        this.closeModal();
      }
    }
  }

  protected get answersGroup(): FormGroup {
    return this.form.get('answers') as FormGroup;
  }

  protected getColorsArray(questionKey: string): FormArray {
    return this.answersGroup.get(questionKey) as FormArray;
  }

  protected getEffectiveMaxColors(question: OrderQuestion): number {
    const configuredMax =
      typeof question.colorMaxCount === 'number' && question.colorMaxCount > 0
        ? question.colorMaxCount
        : 1;

    return Math.max(1, Math.min(configuredMax, COLOR_LIST_HARD_CAP));
  }

  protected addColor(question: OrderQuestion): void {
    const colorsArray = this.getColorsArray(question.key);

    if (colorsArray.length >= this.getEffectiveMaxColors(question)) {
      return;
    }

    colorsArray.push(this.fb.control(''));
  }

  protected removeColor(question: OrderQuestion, index: number): void {
    const colorsArray = this.getColorsArray(question.key);

    if (colorsArray.length <= 1) {
      return;
    }

    colorsArray.removeAt(index);
  }

  protected getMeasurementGroup(questionKey: string): FormGroup {
    return this.answersGroup.get(questionKey) as FormGroup;
  }

  protected isMeasurementOutOfRange(question: OrderQuestion): boolean {
    const group = this.getMeasurementGroup(question.key);
    const rawValue = group.get('value')?.value;
    const unit = group.get('unit')?.value as 'cm' | 'in';
    const breakpoints = question.breakpoints ?? [];

    if (typeof rawValue !== 'number' || !Number.isFinite(rawValue) || rawValue <= 0 || !breakpoints.length) {
      return false;
    }

    const valueCm = unit === 'in' ? rawValue * CM_PER_INCH : rawValue;
    const min = breakpoints[0].upToCm;
    const max = breakpoints[breakpoints.length - 1].upToCm;

    return valueCm < min || valueCm > max;
  }

  protected setMeasurementUnit(question: OrderQuestion, unit: 'cm' | 'in'): void {
    this.getMeasurementGroup(question.key).get('unit')?.setValue(unit);
  }

  protected onSubmit(): void {
    this.submitError = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.scrollToFirstInvalidField();
      return;
    }

    this.setActiveModal('confirm');
  }

  protected closeModal(): void {
    if (this.isSubmitting) {
      return;
    }

    this.setActiveModal(null);
  }

  protected onBackdropClick(): void {
    this.closeModal();
  }

  protected selectPaymentMethod(method: 'etransfer' | 'cash'): void {
    this.paymentMethod = method;
    this.paymentMethodError = false;
  }

  protected onConfirmYesClick(): void {
    if (!this.paymentMethod) {
      this.paymentMethodError = true;
      return;
    }

    this.confirmSubmit();
  }

  protected onReferenceImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const files = Array.from(input?.files ?? []);

    this.fileUploadError = '';

    if (!files.length) {
      return;
    }

    const combinedFiles = [...this.selectedFiles, ...files];

    if (combinedFiles.length > this.maxFileCount) {
      this.fileUploadError = `You can upload up to ${this.maxFileCount} images.`;
      if (input) {
        input.value = '';
      }
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        this.fileUploadError = 'Only image files are allowed.';
        if (input) {
          input.value = '';
        }
        return;
      }

      if (file.size > this.maxFileSizeBytes) {
        this.fileUploadError = 'Each image must be 5 MB or smaller.';
        if (input) {
          input.value = '';
        }
        return;
      }
    }

    this.selectedFiles = combinedFiles;

    if (input) {
      input.value = '';
    }
  }

  protected removeSelectedFile(fileToRemove: File): void {
    this.selectedFiles = this.selectedFiles.filter(
      (file) =>
        !(
          file.name === fileToRemove.name &&
          file.size === fileToRemove.size &&
          file.lastModified === fileToRemove.lastModified
        )
    );

    this.fileUploadError = '';
  }

  protected async confirmSubmit(): Promise<void> {
    this.submitError = '';
    this.submittedOrderId = '';
    this.submittedEmailAddress = '';
    this.submittedPaymentMethod = null;
    this.confirmationEmailSent = false;

    if (this.form.invalid) {
      this.setActiveModal(null);
      this.form.markAllAsTouched();
      this.scrollToFirstInvalidField();
      return;
    }

    const categoryItem = this.category();

    if (!categoryItem) {
      this.setActiveModal(null);
      this.submitError = 'Category not found.';
      return;
    }

    const raw = this.form.getRawValue();

    let uploadedFiles: LovebugUploadedFile[] = [];

    try {
      uploadedFiles = await Promise.all(
        this.selectedFiles.map((file) => this.readFileAsBase64(file))
      );
    } catch (error) {
      console.error(error);
      this.setActiveModal(null);
      this.submitError = 'Something went wrong while reading your images.';
      return;
    }

    const payload: LovebugOrderSubmissionPayload = {
      categorySlug: categoryItem.slug,
      categoryTitle: categoryItem.title,
      general: {
        fullName: raw.fullName ?? '',
        instagramUsername: raw.instagramUsername ?? '',
        emailAddress: raw.emailAddress ?? '',
        isPickup: raw.isPickup ?? false,
        isDelivery: raw.isDelivery ?? false,
        shippingAddress: raw.shippingAddress ?? '',
        isGift: raw.isGift,
        preferredCompletionDate: raw.preferredCompletionDate ?? '',
        paymentMethod: this.paymentMethod!,
        budgetRange: raw.budgetRange ?? '',
        referenceImages: raw.referenceImages ?? '',
        allergies: raw.allergies ?? '',
        agreementYes: raw.agreementYes ?? false
      },
      answers: (raw.answers ?? {}) as Record<string, string | number | boolean | null | string[]>,
      files: uploadedFiles
    };

    this.isSubmitting = true;

    try {
      const response = await this.orderSubmissionService.submitOrder(payload);

      if (!response.success) {
        this.setActiveModal(null);
        this.submitError = response.error || 'Failed to submit order.';
        return;
      }

      this.submittedOrderId = response.orderId ?? '';
      this.submittedEmailAddress = raw.emailAddress ?? '';
      this.submittedPaymentMethod = this.paymentMethod;
      this.confirmationEmailSent = response.emailSent === true;

      this.clearForm();
      this.setActiveModal('success');
    } catch (error) {
      console.error(error);
      this.setActiveModal(null);
      this.submitError = 'Something went wrong while submitting your order.';
    } finally {
      this.isSubmitting = false;
    }
  }

  protected hasControlError(controlName: string, errorName?: string): boolean {
    const control = this.form.get(controlName);

    if (!control || !control.touched) {
      return false;
    }

    if (!errorName) {
      return control.invalid;
    }

    return control.hasError(errorName);
  }

  protected hasReceivalMethodError(): boolean {
    const pickup = this.form.get('isPickup');
    const delivery = this.form.get('isDelivery');
    const touched = !!(pickup?.touched || delivery?.touched);

    return touched && this.form.hasError('receivalMethodRequired');
  }

  protected getReceivalMethodErrorMessage(): string {
    return 'Please select at least one method (Pickup or Delivery).';
  }

  protected hasAnswerError(questionKey: string): boolean {
    const control = this.answersGroup.get(questionKey);
    return !!control && control.touched && control.invalid;
  }

  protected getControlErrorMessage(controlName: string): string {
    const control = this.form.get(controlName);

    if (!control || !control.touched) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Please fill in this required field.';
    }

    if (control.hasError('email')) {
      return 'Please enter a valid email address.';
    }

    if (control.hasError('requiredTrue')) {
      return 'Please check this box before submitting.';
    }

    if (control.hasError('tooSoon')) {
      return 'Please choose a date at least 2 weeks from today (earliest: ' + this.minCompletionDateLabel + ').';
    }

    if (control.hasError('invalidDate')) {
      return 'Please enter a valid date.';
    }

    return 'Please check this field.';
  }

  protected getAnswerErrorMessage(questionKey: string): string {
    const control = this.answersGroup.get(questionKey);

    if (!control || !control.touched) {
      return '';
    }

    if (control instanceof FormGroup) {
      const valueControl = control.get('value');

      if (valueControl?.hasError('required')) {
        return 'Please enter a measurement.';
      }

      if (valueControl?.hasError('min')) {
        return 'Please enter a measurement greater than 0.';
      }

      return '';
    }

    if (control.hasError('required')) {
      return 'Please fill in this required field.';
    }

    if (control.hasError('minFilled')) {
      return 'Please enter at least one color.';
    }

    return 'Please check this field.';
  }

  private async readFileAsBase64(file: File): Promise<LovebugUploadedFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result;

        if (typeof result !== 'string') {
          reject(new Error(`Failed to read file: ${file.name}`));
          return;
        }

        const base64 = result.split(',')[1];

        if (!base64) {
          reject(new Error(`Invalid base64 data for file: ${file.name}`));
          return;
        }

        resolve({
          name: file.name,
          mimeType: file.type,
          base64
        });
      };

      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };

      reader.readAsDataURL(file);
    });
  }

  private clearForm(): void {
    this.form.reset({
      fullName: '',
      instagramUsername: '',
      emailAddress: '',
      isPickup: false,
      isDelivery: false,
      shippingAddress: '',
      isGift: null,
      preferredCompletionDate: '',
      budgetRange: '',
      referenceImages: '',
      allergies: '',
      agreementYes: false
    });

    Object.keys(this.answersGroup.controls).forEach((key) => {
      const control = this.answersGroup.get(key);

      if (control instanceof FormArray) {
        while (control.length > 1) {
          control.removeAt(control.length - 1);
        }
        control.at(0)?.setValue('');
      } else if (control instanceof FormGroup) {
        control.reset({ value: null, unit: 'cm' });
      } else {
        control?.setValue('');
      }

      control?.markAsPristine();
      control?.markAsUntouched();
    });

    this.selectedFiles = [];
    this.fileUploadError = '';

    this.paymentMethod = null;
    this.paymentMethodError = false;

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private scrollToFirstInvalidField(): void {
    setTimeout(() => {
      const firstInvalid = document.querySelector(
        '.form-input.is-invalid, .form-textarea.is-invalid, .form-select.is-invalid, .checkbox-input.is-invalid'
      ) as HTMLElement | null;

      firstInvalid?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      firstInvalid?.focus?.();
    });
  }
}