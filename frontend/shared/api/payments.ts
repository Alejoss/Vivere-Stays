import { apiRequest } from "./client";

export const paymentService = {
  async createCheckoutSession(planType: string, numberOfRooms: number, calculatedPrice: number): Promise<{ sessionId: string }> {
    return apiRequest<{ sessionId: string }>({
      method: "POST",
      url: "/profiles/create-checkout-session/",
      data: {
        planType,
        numberOfRooms,
        calculatedPrice,
      },
    });
  },
};
