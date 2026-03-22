import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
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
import { OrderCategory } from '../models/order-categories.model';
import {
  LovebugOrderSubmissionPayload,
  LovebugUploadedFile,
  OrderSubmissionService
} from '../services/order-submission.service';

type ActiveModal = 'confirm' | 'success' | null;

@Component({
  selector: 'app-category-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './category-page.component.html',
  styleUrl: './category-page.component.scss',
})
export class CategoryPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly howToOrderService = inject(HowToOrderService);
  private readonly fb = inject(FormBuilder);
  private readonly orderSubmissionService = inject(OrderSubmissionService);

  protected confirmationEmailSent = false;
  protected readonly todayDate = new Date().toISOString().split('T')[0];

  protected isSubmitting = false;
  protected submitError = '';
  protected submittedOrderId = '';
  protected submittedEmailAddress = '';
  protected activeModal: ActiveModal = null;

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
    shippingAddress: ['', Validators.required],
    isGift: [null as boolean | null, Validators.required],
    preferredCompletionDate: [
      '',
      [Validators.required, this.notPastDateValidator()]
    ],
    isRushOrder: [null as boolean | null, Validators.required],
    budgetRange: [''],
    referenceImages: [''],
    allergies: [''],
    agreementYes: [false, Validators.requiredTrue],
    answers: this.fb.group({})
  });

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
        const validators = question.required ? [Validators.required] : [];
        answersGroup.addControl(
          question.key,
          new FormControl('', validators)
        );
      });
    });
  }

  private normalizeDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  private notPastDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      if (!value) {
        return null;
      }

      const selectedDate = new Date(value);

      if (Number.isNaN(selectedDate.getTime())) {
        return { invalidDate: true };
      }

      const today = this.normalizeDate(new Date());
      const chosen = this.normalizeDate(selectedDate);

      return chosen < today ? { pastDate: true } : null;
    };
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
        this.confirmSubmit();
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

  protected onSubmit(): void {
    this.submitError = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.scrollToFirstInvalidField();
      return;
    }

    this.activeModal = 'confirm';
  }

  protected closeModal(): void {
    if (this.isSubmitting) {
      return;
    }

    this.activeModal = null;
  }

  protected onBackdropClick(): void {
    this.closeModal();
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
    this.confirmationEmailSent = false;

    if (this.form.invalid) {
      this.activeModal = null;
      this.form.markAllAsTouched();
      this.scrollToFirstInvalidField();
      return;
    }

    const categoryItem = this.category();

    if (!categoryItem) {
      this.activeModal = null;
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
      this.activeModal = null;
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
        shippingAddress: raw.shippingAddress ?? '',
        isGift: raw.isGift,
        preferredCompletionDate: raw.preferredCompletionDate ?? '',
        isRushOrder: raw.isRushOrder,
        budgetRange: raw.budgetRange ?? '',
        referenceImages: raw.referenceImages ?? '',
        allergies: raw.allergies ?? '',
        agreementYes: raw.agreementYes ?? false
      },
      answers: (raw.answers ?? {}) as Record<string, string | number | boolean | null>,
      files: uploadedFiles
    };

    this.isSubmitting = true;

    try {
      const response = await this.orderSubmissionService.submitOrder(payload);

      if (!response.success) {
        this.activeModal = null;
        this.submitError = response.error || 'Failed to submit order.';
        return;
      }

      this.submittedOrderId = response.orderId ?? '';
      this.submittedEmailAddress = raw.emailAddress ?? '';
      this.confirmationEmailSent = response.emailSent === true;

      this.clearForm();
      this.activeModal = 'success';
    } catch (error) {
      console.error(error);
      this.activeModal = null;
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

    if (control.hasError('pastDate')) {
      return 'Please choose a date that is not in the past.';
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

    if (control.hasError('required')) {
      return 'Please fill in this required field.';
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
      shippingAddress: '',
      isGift: null,
      preferredCompletionDate: '',
      isRushOrder: null,
      budgetRange: '',
      referenceImages: '',
      allergies: '',
      agreementYes: false
    });

    Object.keys(this.answersGroup.controls).forEach((key) => {
      this.answersGroup.get(key)?.setValue('');
      this.answersGroup.get(key)?.markAsPristine();
      this.answersGroup.get(key)?.markAsUntouched();
    });

    this.selectedFiles = [];
    this.fileUploadError = '';

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