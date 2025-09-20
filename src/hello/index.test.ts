import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler } from './index';

// Mock AWS Powertools
jest.mock('@aws-lambda-powertools/logger');
jest.mock('@aws-lambda-powertools/tracer');
jest.mock('@aws-lambda-powertools/metrics');
jest.mock('@aws-lambda-powertools/parameters/ssm');

const createMockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
  body: null,
  headers: {
    'User-Agent': 'test-agent'
  },
  multiValueHeaders: {},
  httpMethod: 'GET',
  isBase64Encoded: false,
  path: '/hello',
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {
    requestId: 'test-request-id',
    stage: 'test',
    resourceId: 'test-resource',
    httpMethod: 'GET',
    resourcePath: '/hello',
    path: '/test/hello',
    accountId: '123456789012',
    apiId: 'test-api-id',
    protocol: 'HTTP/1.1',
    requestTime: '09/Apr/2015:12:34:56 +0000',
    requestTimeEpoch: 1428582896000,
    identity: {
      accessKey: null,
      accountId: null,
      apiKey: null,
      apiKeyId: null,
      caller: null,
      clientCert: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      principalOrgId: null,
      sourceIp: '127.0.0.1',
      user: null,
      userAgent: 'test-agent',
      userArn: null
    },
    authorizer: null
  },
  resource: '/hello',
  ...overrides
});

const createMockContext = (overrides: Partial<Context> = {}): Context => ({
  callbackWaitsForEmptyEventLoop: true,
  functionName: 'hello-function',
  functionVersion: '$LATEST',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:hello-function',
  memoryLimitInMB: '128',
  awsRequestId: 'test-aws-request-id',
  logGroupName: '/aws/lambda/hello-function',
  logStreamName: '2023/01/01/[$LATEST]abcdefg',
  getRemainingTimeInMillis: () => 30000,
  done: jest.fn(),
  fail: jest.fn(),
  succeed: jest.fn(),
  ...overrides
});

describe('Hello Lambda Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set test environment variables
    process.env.ENVIRONMENT = 'test';
    process.env._X_AMZN_TRACE_ID = 'test-trace-id';
  });

  afterEach(() => {
    delete process.env.ENVIRONMENT;
    delete process.env._X_AMZN_TRACE_ID;
  });

  it('should return 200 status with hello message', async () => {
    const event = createMockEvent();
    const context = createMockContext();

    const result = await handler(event, context) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(result.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Request-ID': 'test-aws-request-id'
      })
    );

    const body = JSON.parse(result.body);
    expect(body).toEqual(
      expect.objectContaining({
        message: 'Hello from TypeScript Lambda with Powertools!',
        path: '/hello',
        requestId: 'test-request-id',
        version: 'v1.0.0'
      })
    );
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should handle different paths correctly', async () => {
    const event = createMockEvent({ path: '/hello/world' });
    const context = createMockContext();

    const result = await handler(event, context) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.path).toBe('/hello/world');
  });

  it('should include correlation ID in headers', async () => {
    const event = createMockEvent();
    const context = createMockContext();

    const result = await handler(event, context) as APIGatewayProxyResult;

    expect(result.headers).toEqual(
      expect.objectContaining({
        'X-Correlation-ID': expect.any(String),
        'X-Trace-ID': 'test-trace-id'
      })
    );
  });

  it('should handle missing request context gracefully', async () => {
    const event = createMockEvent({
      requestContext: {
        ...createMockEvent().requestContext,
        requestId: undefined as any
      }
    });
    const context = createMockContext();

    const result = await handler(event, context) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.requestId).toBe('unknown');
  });

  it('should handle missing path gracefully', async () => {
    const event = createMockEvent({ path: undefined as any });
    const context = createMockContext();

    const result = await handler(event, context) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.path).toBe('/hello');
  });

  it('should return proper CORS headers', async () => {
    const event = createMockEvent();
    const context = createMockContext();

    const result = await handler(event, context) as APIGatewayProxyResult;

    expect(result.headers).toEqual(
      expect.objectContaining({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
      })
    );
  });

  it('should have well-formed JSON response', async () => {
    const event = createMockEvent();
    const context = createMockContext();

    const result = await handler(event, context) as APIGatewayProxyResult;

    expect(() => JSON.parse(result.body)).not.toThrow();
    const body = JSON.parse(result.body);
    expect(typeof body).toBe('object');
    expect(body).not.toBeNull();
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      // Test that the function handles invalid input gracefully
      // Since our functions are well designed and handle missing properties,
      // this test verifies they still work with minimal data
      const minimalEvent = {
        httpMethod: 'GET',
        headers: {},
        requestContext: {},
      } as APIGatewayProxyEvent;

      const context = createMockContext();

      const result = await handler(minimalEvent, context) as APIGatewayProxyResult;

      // The function should still work and return 200
      expect(result.statusCode).toBe(200);
      expect(result.headers).toEqual(
        expect.objectContaining({
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        })
      );

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Hello from TypeScript Lambda with Powertools!');
    });
  });
});