"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@acf/ui";
import { useAuth } from "@/lib/auth-context";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export default function SignupPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    await signUp(data.email, data.password, data.name);
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF9F5] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-[#D97757] text-white font-semibold">
            AC
          </div>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Start finding viral clips in minutes</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Input placeholder="Name" {...register("name")} />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <Input placeholder="Email" type="email" {...register("email")} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <Input placeholder="Password" type="password" {...register("password")} />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>
            <Button type="submit" variant="accent" className="w-full" disabled={isSubmitting}>
              Create account
            </Button>
          </form>
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#E8E6E1]" />
            <span className="text-xs text-[#6B6B6B]">or</span>
            <div className="h-px flex-1 bg-[#E8E6E1]" />
          </div>
          <Button variant="outline" className="w-full" onClick={() => signInWithGoogle().then(() => router.push("/dashboard"))}>
            Continue with Google
          </Button>
          <p className="mt-4 text-center text-sm text-[#6B6B6B]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#D97757] hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
