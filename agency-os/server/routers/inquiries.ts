import { z } from "zod";
import { createNotification, createPublicInquiry } from "../firebaseAgencyDb.js";
import { publicProcedure, router } from "../_core/trpc.js";

export const publicInquirySchema = z.object({
  name: z.string().trim().min(1).max(256),
  companyName: z.string().trim().min(1).max(256),
  email: z.string().trim().email().max(320),
  request: z.string().trim().min(10).max(4000),
});

export const inquiriesRouter = router({
  submit: publicProcedure.input(publicInquirySchema).mutation(async ({ input }) => {
    const inquiry = await createPublicInquiry(input);
    await createNotification({
      recipientRole: "admin",
      notificationType: "public_inquiry",
      title: "New project request",
      message: `${inquiry.name} from ${inquiry.companyName} submitted a project request.`,
    });
    return { success: true, inquiryId: inquiry.id };
  }),
});
