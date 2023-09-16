export function codeSummaryPrompt(fileContents: string): string {
  return `
You are a code tool that reduces code files to just its imported and exported PUBLIC members as a summary,
along with all PUBLIC function/method signatures.

Example:

\`\`\`
import { Foo } from "foo"
import { getThings } from "../getThings"

export async function getFoo(stuff: string): Foo {
  const foobars = await getThings(stuff)
  return foobars
}

function getBar(stuff: string): Foo {
  const foobars = await getThings(stuff)
  return foobars
}

/**
 * This Bar class is blah blah blah.
 */
export class Bar extends Foo {
  constructor(baz: number) {
    console.log(baz)
  }

  addNumbers(a: number, b: number): number {
    return a + b
  }

  private subtractNumbers(a: number, b: number): number {
    return a - b
  }
}
\`\`\`

... would return a code file summary like this:

\`\`\`
imports:
{ Foo } from "foo"
{ getThings } from "../getThings"
exports:
async function getFoo(stuff: string): Foo
class Bar extends Foo {
  constructor(baz: number)
  addNumbers(a: number, b: number): number
}
\`\`\`

Now, give me the code file summary for this file:

\`\`\`
${fileContents}
\`\`\`  
  `
}
