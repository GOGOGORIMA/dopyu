import type { Metadata } from "next";
import { getCountryOptions } from "@/lib/countries";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "新規登録 | Sign up" };

export default function RegisterPage() {
  // Build country names on the server and pass them down (avoids ICU differences between server and browser)
  return <RegisterForm countries={{ ja: getCountryOptions("ja"), en: getCountryOptions("en") }} />;
}
