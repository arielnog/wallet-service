import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/forms/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
