import { getTable, distriate } from './utils';

describe('getTable', () => {
  // Test case 1: Input string contains "TABLE " followed by digits and a space.
  test('should return digits when "TABLE " is followed by digits and a space', () => {
    expect(getTable("This is for TABLE 123 Dining")).toBe("123");
  });

  // Test case 2: Input string contains "TABLE " but not followed by digits.
  test('should return "no table information found" when "TABLE " is not followed by digits', () => {
    expect(getTable("This is for TABLE abc Dining")).toBe("no table information found");
  });

  // Test case 3: Input string contains "TABLE " followed by digits but no trailing space.
  test('should return "no table information found" when "TABLE " is followed by digits but no space', () => {
    expect(getTable("This is for TABLE 123Dining")).toBe("no table information found");
  });

  // Test case 4: Input string does not contain "TABLE ".
  test('should return "no table information found" when "TABLE " is not present', () => {
    expect(getTable("This is for TBLE 123 Dining")).toBe("no table information found");
  });

  // Test case 5: Input string contains "TABLE " and returnBoolean is true.
  test('should return true when "TABLE " is present and returnBoolean is true', () => {
    expect(getTable("This is for TABLE 123 Dining", true)).toBe(true);
  });

  // Test case 6: Input string does not contain "TABLE " and returnBoolean is true.
  test('should return false when "TABLE " is not present and returnBoolean is true', () => {
    expect(getTable("This is for TBLE 123 Dining", true)).toBe(false);
  });

  // Test case 7: Input string is empty.
  test('should return "no table information found" for an empty string', () => {
    expect(getTable("")).toBe("no table information found");
  });

  // Test case 8: Input string contains "TABLE " at the very end.
  test('should return "no table information found" when "TABLE " is at the end of the string', () => {
    expect(getTable("This is for TABLE ")).toBe("no table information found");
  });

  // Test case 9: Input string contains "TABLE " followed by digits, a space, and then more characters.
  test('should return digits when "TABLE " is followed by digits, a space, and more characters', () => {
    expect(getTable("Order for TABLE 456 Takeout")).toBe("456");
  });

  // Test case 10: Multiple "TABLE " occurrences, ensure the last one is used.
  test('should use the last occurrence of "TABLE " when multiple are present', () => {
    expect(getTable("TABLE 1 Ignore this TABLE 789 Process this")).toBe("789");
  });
});

describe('distriate', () => {
  // Test case 1: Calling distriate with a specific tag.
  test('should return a string with the specified tag', () => {
    const result = distriate("myTag");
    expect(result).toMatch(/^myTag-inno-[a-z0-9]{4}-[a-z0-9]{4}$/);
  });

  // Test case 2: Calling distriate with no arguments.
  test('should default to "kcs" when no tag is provided', () => {
    const result = distriate();
    expect(result).toMatch(/^kcs-inno-[a-z0-9]{4}-[a-z0-9]{4}$/);
  });

  // Test case 3: Calling distriate with an empty string.
  test('should default to "kcs" when an empty tag is provided', () => {
    const result = distriate("");
    expect(result).toMatch(/^kcs-inno-[a-z0-9]{4}-[a-z0-9]{4}$/);
  });

  // Test case 4: Verifying the output format (correct separators, lengths of random parts).
  test('should return a string in the correct format', () => {
    const result = distriate("formatTest");
    const parts = result.split('-');
    expect(parts.length).toBe(4);
    expect(parts[0]).toBe("formatTest");
    expect(parts[1]).toBe("inno");
    expect(parts[2]).toMatch(/^[a-z0-9]{4}$/);
    expect(parts[3]).toMatch(/^[a-z0-9]{4}$/);
  });

  // Test case 5: Verifying that subsequent calls with the same tag produce different random parts.
  test('should produce different random parts on subsequent calls', () => {
    const result1 = distriate("uniqueTest");
    const result2 = distriate("uniqueTest");
    expect(result1).not.toBe(result2);
    // Further check if just the random parts are different
    const randomPart1_call1 = result1.split('-').slice(2).join('-');
    const randomPart1_call2 = result2.split('-').slice(2).join('-');
    expect(randomPart1_call1).not.toBe(randomPart1_call2);
  });

  // Test case 6: Check if the random parts only contain lowercase alphanumeric characters
  test('random parts should only contain lowercase alphanumeric characters', () => {
    const result = distriate("charsetTest");
    const parts = result.split('-');
    expect(parts[2]).toMatch(/^[a-z0-9]+$/);
    expect(parts[3]).toMatch(/^[a-z0-9]+$/);
  });
});
