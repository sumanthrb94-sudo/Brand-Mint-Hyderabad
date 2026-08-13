import { z } from "zod";
import { notifyOwner } from "../_core/notification";
import { publicProcedure, router } from "../_core/trpc";
import { createCompletedOnboarding, createNotification, REQUIRED_POLICY_TYPES } from "../agencyDb";

const onboardingSchema = z.object({
  name: z.string().trim().min(1).max(256),
  companyName: z.string().trim().min(1).max(256),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(48).optional(),
  serviceType: z.enum(["website", "internal_tool", "brand_identity", "performance_media", "ecommerce"]),
  preferredTimeline: z.string().trim().max(256).optional(),
  projectBrief: z.string().trim().min(1).max(10000),
  deliverables: z.string().trim().max(10000).optional(),
  acceptedPolicies: z.array(z.enum(REQUIRED_POLICY_TYPES)).length(4),
});

export const onboardingRouter = router({
  submit: publicProcedure.input(onboardingSchema).mutation(async ({ input }) => {
    const result = await createCompletedOnboarding(input);
    await createNotification({
      recipientRole: "admin",
      notificationType: "onboarding_complete",
      title: "Client onboarding completed",
      message: `A new client onboarding record was completed for ${result.client.companyName}.`,
      clientId: result.client.id,
    });
    await createNotification({
      recipientRole: "admin",
      notificationType: "legal_accepted",
      title: "Legal documents accepted",
      message: `Required policy acceptance was recorded for ${result.client.companyName}.`,
      clientId: result.client.id,
    });
    await notifyOwner({ title: "Client onboarding completed", content: `Brand Mint Studios received a completed onboarding record for ${result.client.companyName}.` });
    return { success: true, onboardingId: result.onboardingPublicId };
  }),
});
