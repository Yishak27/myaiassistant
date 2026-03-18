import { stepCountIs, streamText } from "ai";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { getLanguageModel } from "@/lib/ai/providers";
import { ChatbotError } from "@/lib/errors";
import { createComposioClient, getComposioExternalUserId } from "@/lib/composio";

export const maxDuration = 60;

const runBodySchema = z.object({
  prompt: z.string().min(1),
  modelId: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  let body: z.infer<typeof runBodySchema>;
  try {
    body = runBodySchema.parse(await request.json());
  } catch (_) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  try {
    const composio = createComposioClient();
    const externalUserId = getComposioExternalUserId(session.user.id);
    const toolSession = await composio.create(externalUserId);

    const tools = await toolSession.tools();

    const result = streamText({
      model: getLanguageModel(body.modelId ?? "openai/gpt-4o-mini"),
      prompt: body.prompt,
      stopWhen: stepCountIs(10),
      tools,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Composio run error:", error);
    return new ChatbotError("offline:chat").toResponse();
  }
}

