import { isInvalidLunoxReply } from "@/utils/lunoxReply";

describe("Lunox public replies", () => {
  it.each([
    'analysis\n\nNeed getLostClients days away 60. call function.<|end|><|start|>assistant<|channel|>commentary to=functions.getLostClients {"days_away":60}<|call|>',
    '<|start|>assistant<|channel|>final<|message|>Some text',
    '', null, undefined,
  ])("rejects incomplete or internal output: %s", value => {
    expect(isInvalidLunoxReply(value)).toBe(true);
  });
  it.each([
    '**14 clients** haven’t visited in 60 days.',
    '| Client | Last visit |\n|---|---|\n| Example | 1 Aug |',
    'Here is the analysis of your visits.',
  ])("preserves normal answers: %s", value => {
    expect(isInvalidLunoxReply(value)).toBe(false);
  });
});
