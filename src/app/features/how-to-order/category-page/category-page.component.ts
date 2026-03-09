import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs/operators';

import { HowToOrderService } from '../services/how-to-order.service';
import { OrderCategory } from '../models/order-categories.model';
import {
  LovebugOrderSubmissionPayload,
  OrderSubmissionService
} from '../services/order-submission.service';

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
    preferredCompletionDate: ['', Validators.required],
    isRushOrder: [null as boolean | null, Validators.required],
    budgetRange: [''],
    referenceImages: [''],
    allergies: [''],
    agreementYes: [false, Validators.requiredTrue],
    answers: this.fb.group({})
  });

  protected isSubmitting = false;
  protected submitError = '';
  protected submitSuccess = '';
  protected submittedOrderId = '';

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

  protected get answersGroup(): FormGroup {
    return this.form.get('answers') as FormGroup;
  }

  protected async onSubmit(): Promise<void> {
    this.submitError = '';
    this.submitSuccess = '';
    this.submittedOrderId = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const categoryItem = this.category();

    if (!categoryItem) {
      this.submitError = 'Category not found.';
      return;
    }

    const raw = this.form.getRawValue();

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
      files: []
    };

    this.isSubmitting = true;

    try {
      const response = await this.orderSubmissionService.submitOrder(payload);

      if (!response.success) {
        this.submitError = response.error || 'Failed to submit order.';
        return;
      }

      this.submitSuccess = 'Order submitted successfully.';
      this.submittedOrderId = response.orderId ?? '';

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

      const rebuiltAnswersGroup = this.answersGroup;
      Object.keys(rebuiltAnswersGroup.controls).forEach((key) => {
        rebuiltAnswersGroup.get(key)?.setValue('');
        rebuiltAnswersGroup.get(key)?.markAsPristine();
        rebuiltAnswersGroup.get(key)?.markAsUntouched();
      });
    } catch (error) {
      console.error(error);
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
}