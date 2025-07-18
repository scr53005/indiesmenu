function testRegex(input: string): RegExpMatchArray | null {
  const regex = /^(\d+)(?:\s|$)/;
  const result = input.match(regex);
  console.log(`Input: "${input}"`);
  console.log(`Match: ${result ? JSON.stringify(result) : 'null'}`);
  console.log('---');
  return result;
}

// Test cases
testRegex("123 "); // Should match
testRegex("123");  // Should match
testRegex("456 "); // Should match
testRegex("123abc"); // Should not match
testRegex("12 34"); // Should match (captures "12")
testRegex(""); // Should not match
testRegex("abc"); // Should not match