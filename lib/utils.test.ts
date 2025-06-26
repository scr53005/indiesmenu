import { getTable } from './utils';

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
