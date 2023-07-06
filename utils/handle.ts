export async function handle<ErrorType = Error, Result = any>(
  val: Promise<Result> | (() => Promise<Result>)
) {
  try {
    const toWait = typeof val === "function" ? val() : val;
    const result = await toWait;
    return [result, null] as const;
  } catch (e) {
    return [null, e as ErrorType] as const;
  }
}
