import { getTable, distriate, generateDistriatedHiveOp } from './utils';

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

describe('generateDistriatedHiveOp', () => {
  test('should correctly construct Hive URI with distriated memo', () => {
    const recipient = 'testuser';
    const amountHbd = '1.000';
    const memo = 'testmemo';
    const result = generateDistriatedHiveOp(recipient, amountHbd, memo);

    expect(result).toMatch(/^hive:\/\/sign\/op\/.+/);
    const encodedPart = result.substring('hive://sign/op/'.length);
    const decodedOp = JSON.parse(Buffer.from(encodedPart, 'base64').toString());

    expect(decodedOp[0]).toBe('transfer');
    expect(decodedOp[1].to).toBe(recipient);
    expect(decodedOp[1].amount).toBe('1.000 HBD');
    expect(decodedOp[1].memo).toMatch(/^testmemo-inno-[a-z0-9]{4}-[a-z0-9]{4}$/);
  });

  test('should handle different amounts correctly', () => {
    const result = generateDistriatedHiveOp('anotheruser', '0.5', 'anothermemo');
    const encodedPart = result.substring('hive://sign/op/'.length);
    const decodedOp = JSON.parse(Buffer.from(encodedPart, 'base64').toString());
    expect(decodedOp[1].amount).toBe('0.500 HBD');
  });

  test('should use "kcs" for distriate if memo is empty', () => {
    const result = generateDistriatedHiveOp('user3', '10.123', '');
    const encodedPart = result.substring('hive://sign/op/'.length);
    const decodedOp = JSON.parse(Buffer.from(encodedPart, 'base64').toString());
    expect(decodedOp[1].memo).toMatch(/^kcs-inno-[a-z0-9]{4}-[a-z0-9]{4}$/);
  });

  test('should throw error for invalid amountHbd', () => {
    expect(() => {
      generateDistriatedHiveOp('user4', 'invalidAmount', 'somememo');
    }).toThrow('Invalid amount_hbd: invalidAmount');
  });

  // User requested test case
  test('should correctly handle specific input: indies.cafe, 0.20, "Simon Pils 25cl TABLE 21"', () => {
    const recipient = 'indies.cafe';
    const amountHbd = '0.20';
    const memo = 'Simon Pils 25cl TABLE 21';
    const result = generateDistriatedHiveOp(recipient, amountHbd, memo);
    console.log('Output for specific test case (indies.cafe, 0.20, "Simon Pils 25cl TABLE 21"):', result);

    expect(result).toMatch(/^hive:\/\/sign\/op\/.+/);
    const encodedPart = result.substring('hive://sign/op/'.length);
    const decodedOp = JSON.parse(Buffer.from(encodedPart, 'base64').toString());

    expect(decodedOp[0]).toBe('transfer');
    expect(decodedOp[1].to).toBe(recipient);
    expect(decodedOp[1].amount).toBe('0.200 HBD');
    // Check that the memo was processed by distriate
    // The original memo "Simon Pils 25cl TABLE 21" should be the tag part of the distriated memo
    expect(decodedOp[1].memo.startsWith(memo + '-inno-')).toBe(true);
    expect(decodedOp[1].memo).toMatch(new RegExp(`^${memo}-inno-[a-z0-9]{4}-[a-z0-9]{4}$`));
  });
});
