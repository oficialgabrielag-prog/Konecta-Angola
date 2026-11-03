# Implementation Plan: Verification and Subscription System

## 1. Type Definitions (src/types.ts)
- Add interfaces for: `VerificationPricing`, `VerificationRequest` (base), `SubscriptionPlan`, `SubscriptionRequest`, `UserSubscription`, `PaymentTransaction`.

## 2. API Layer Updates (src/lib/d1Client.ts)
- Add `verification` object:
    - `getPricing()`
    - `requestVerification(targetType: 'profile' | 'organization', targetId: string, proofUrl: string, priceAmount: number)`
    - `listVerificationRequests()`
    - `reviewVerification(requestId: string, targetType: 'profile' | 'organization', status: 'approved' | 'rejected', reason?: string)`
- Add `subscriptions` object:
    - `getPlans()`
    - `requestSubscription(planId: string)`
    - `submitProof(requestId: string, proofPath: string, paymentMethod: string, paymentReference: string)`
    - `listSubscriptionRequests()`
    - `reviewSubscriptionRequest(requestId: string, status: 'approved' | 'rejected', reason?: string)`

## 3. UI Development
- `src/pages/Verification.tsx`: Verification landing, modality selection, price loading, proof upload.
- `src/pages/Plans.tsx`: Subscription plans list, plan selection, request initiation, proof upload.

## 4. Admin Panel Integration (src/pages/Admin.tsx)
- Update existing admin panel to include:
    - Verification Requests (Personal/Org)
    - Subscription Requests
    - Payment Method Configuration
    - Plan Management (CRUD operations)

## 5. UI Updates
- Update profile and organization displays to show verification badges.

## 6. Testing Strategy
- Create verification request (Personal).
- Create verification request (Org).
- Approve verification request.
- Create subscription request.
- Submit payment proof.
- Review subscription request.
- Verify notifications trigger.
