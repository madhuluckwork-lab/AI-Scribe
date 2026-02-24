"use server";

import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { AuthError } from "next-auth";
import { redeemPendingInvites } from "@/lib/invite-utils";

export async function registerAction(values: RegisterInput) {
  const validated = registerSchema.safeParse(values);
  if (!validated.success) {
    return { error: "Invalid fields" };
  }

  const { name, email, password, specialty } = validated.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "Email already in use" };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name,
      email,
      hashedPassword,
      specialty: specialty || undefined,
      emailVerified: new Date(), // Auto-verify for MVP
      preferences: {
        create: { defaultNoteType: "SOAP" },
      },
    },
  });

  return { success: "Account created successfully. You can now sign in." };
}

export async function loginAction(email: string, password: string) {
  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    // If signIn succeeds with redirect: false, we handle redirect manually
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password" };
        case "MissingCSRF" as any:
          // Retry without CSRF for server action context
          return { error: "Login failed. Please try again." };
        default:
          return { error: "Something went wrong" };
      }
    }
    throw error;
  }

  // Redirect after successful sign-in
  const { redirect } = await import("next/navigation");
  redirect("/dashboard");
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function registerPatientAction(values: {
  name: string;
  email: string;
  password: string;
  inviteToken: string;
}) {
  const invite = await prisma.noteShareInvite.findUnique({
    where: { token: values.inviteToken },
  });

  if (!invite || invite.expiresAt < new Date() || invite.redeemedAt) {
    return { error: "Invalid or expired invitation" };
  }

  if (invite.patientEmail !== values.email) {
    return { error: "Email mismatch" };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: values.email },
  });
  if (existingUser) {
    return { error: "An account with this email already exists. Please sign in instead." };
  }

  const hashedPassword = await bcrypt.hash(values.password, 12);

  const user = await prisma.user.create({
    data: {
      name: values.name,
      email: values.email,
      hashedPassword,
      role: "PATIENT",
      emailVerified: new Date(),
    },
  });

  // Redeem this invite and any other pending invites for this email
  await redeemPendingInvites(user.id, values.email);

  return { success: "Account created. You can now sign in." };
}

export async function redeemInviteAction(inviteToken: string) {
  const { auth: getAuth } = await import("@/lib/auth");
  const session = await getAuth();
  if (!session?.user) return { error: "Unauthorized" };

  const invite = await prisma.noteShareInvite.findUnique({
    where: { token: inviteToken },
  });

  if (!invite || invite.expiresAt < new Date()) {
    return { error: "Invalid or expired invitation" };
  }

  // Create NoteShare if it doesn't exist
  await prisma.noteShare.upsert({
    where: {
      noteId_patientId: {
        noteId: invite.noteId,
        patientId: session.user.id,
      },
    },
    create: {
      noteId: invite.noteId,
      patientId: session.user.id,
      sharedById: invite.invitedById,
      message: invite.message,
    },
    update: {},
  });

  await prisma.noteShareInvite.update({
    where: { id: invite.id },
    data: { redeemedAt: new Date() },
  });

  return { success: true };
}
