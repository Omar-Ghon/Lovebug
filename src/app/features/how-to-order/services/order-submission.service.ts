import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface LovebugGeneralOrderInfo {
  fullName: string;
  instagramUsername: string;
  emailAddress: string;
  shippingAddress: string;
  isGift: boolean | null;
  preferredCompletionDate: string;
  isRushOrder: boolean | null;
  budgetRange: string;
  referenceImages: string;
  allergies: string;
  agreementYes: boolean;
}

export interface LovebugOrderAnswers {
  [key: string]: string | number | boolean | null;
}

export interface LovebugUploadedFile {
  name: string;
  mimeType: string;
  base64: string;
}

export interface LovebugOrderSubmissionPayload {
  categorySlug: string;
  categoryTitle: string;
  general: LovebugGeneralOrderInfo;
  answers: LovebugOrderAnswers;
  files: LovebugUploadedFile[];
}

export type LovebugOrderSubmissionResponse = {
  success: boolean;
  message?: string;
  orderId?: string;
  error?: string;
  emailSent?: boolean;
  emailError?: string;
};

@Injectable({
  providedIn: 'root'
})
export class OrderSubmissionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.lovebugApiUrl;

  async submitOrder(
    payload: LovebugOrderSubmissionPayload
  ): Promise<LovebugOrderSubmissionResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<LovebugOrderSubmissionResponse>(
          this.apiUrl,
          JSON.stringify(payload),
          {
            headers: new HttpHeaders({
              'Content-Type': 'text/plain;charset=utf-8'
            })
          }
        )
      );

      return response;
    } catch (error) {
      console.error('Failed to submit Lovebug order:', error);

      return {
        success: false,
        error: 'Failed to submit order. Please try again.'
      };
    }
  }
}