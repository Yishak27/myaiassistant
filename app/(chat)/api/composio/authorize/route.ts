import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { ChatbotError } from "@/lib/errors";
import { createComposioClient, getComposioExternalUserId } from "@/lib/composio";

export const maxDuration = 60;

const authorizeBodySchema = z.object({
  app: z.string().min(1), // e.g. "gmail"
  callbackUrl: z.string().url(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  let body: z.infer<typeof authorizeBodySchema>;
  try {
    body = authorizeBodySchema.parse(await request.json());
  } catch (_) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  try {
    const composio = createComposioClient();
    const externalUserId = getComposioExternalUserId(session.user.id);

    // manageConnections=false -> we explicitly kick off OAuth when needed
    const toolSession = await composio.create(externalUserId, {
      manageConnections: false,
    } as any);

    const connectionRequest = await toolSession.authorize(body.app, {
      callbackUrl: body.callbackUrl,
    });

    return Response.json(
      {
        redirectUrl: connectionRequest.redirectUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Composio authorize error:", error);
    return new ChatbotError("offline:chat").toResponse();
  }
}

