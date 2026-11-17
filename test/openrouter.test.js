const mockCreate = jest.fn();
jest.mock('openai', () => {
  const MockOpenAI = jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }));
  MockOpenAI.APIError = class APIError extends Error {};
  return { __esModule: true, default: MockOpenAI };
});
const { OpenRouterClient } = require('../src/openrouter');

const request = { prChanges: 'config change', skillLevels: ['Senior'] };
const valid = JSON.stringify({
  estimations: {
    Senior: {
      timeEstimate: '2 hours',
      reasoning: 'Configuration',
      complexity: 'Low',
    },
  },
});
const response = (content) => ({ choices: [{ message: { content } }] });

beforeEach(() => mockCreate.mockReset());

test('retries once when the model returns malformed JSON', async () => {
  mockCreate
    .mockResolvedValueOnce(response('{"estimations": {,}}'))
    .mockResolvedValueOnce(response(valid));
  const result = await new OpenRouterClient('test').estimateDevTime(request);
  expect(result.estimations.Senior.timeEstimate).toBe('2 hours');
  expect(mockCreate).toHaveBeenCalledTimes(2);
});

test('fails after the bounded retry if JSON remains malformed', async () => {
  mockCreate.mockResolvedValue(response('{"estimations": {,}}'));
  await expect(
    new OpenRouterClient('test').estimateDevTime(request)
  ).rejects.toThrow('Failed to parse OpenRouter response');
  expect(mockCreate).toHaveBeenCalledTimes(2);
});

test('retries once when the model returns empty content', async () => {
  mockCreate
    .mockResolvedValueOnce(response(''))
    .mockResolvedValueOnce(response(valid));
  const result = await new OpenRouterClient('test').estimateDevTime(request);
  expect(result.estimations.Senior.timeEstimate).toBe('2 hours');
  expect(mockCreate).toHaveBeenCalledTimes(2);
});

test('fails after the bounded retry if content stays empty', async () => {
  mockCreate.mockResolvedValue(response(null));
  await expect(
    new OpenRouterClient('test').estimateDevTime(request)
  ).rejects.toThrow('No response content from OpenRouter');
  expect(mockCreate).toHaveBeenCalledTimes(2);
});
