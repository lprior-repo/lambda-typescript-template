import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler } from './index';

// Mock AWS Powertools
jest.mock('@aws-lambda-powertools/logger');
jest.mock('@aws-lambda-powertools/tracer');
jest.mock('@aws-lambda-powertools/metrics');

const createMockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
  body: null,
  headers: {
    'User-Agent': 'test-agent'
  },
  multiValueHeaders: {},
  httpMethod: 'GET',
  isBase64Encoded: false,
  path: '/users',
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {
    requestId: 'test-request-id',
    stage: 'test',
    resourceId: 'test-resource',
    httpMethod: 'GET',
    resourcePath: '/users',
    path: '/test/users',
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
  resource: '/users',
  ...overrides
});

const createMockContext = (overrides: Partial<Context> = {}): Context => ({
  callbackWaitsForEmptyEventLoop: true,
  functionName: 'users-function',
  functionVersion: '$LATEST',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:users-function',
  memoryLimitInMB: '128',
  awsRequestId: 'test-aws-request-id',
  logGroupName: '/aws/lambda/users-function',
  logStreamName: '2023/01/01/[$LATEST]abcdefg',
  getRemainingTimeInMillis: () => 30000,
  done: jest.fn(),
  fail: jest.fn(),
  succeed: jest.fn(),
  ...overrides
});

describe('Users Lambda Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set test environment variables
    process.env.ENVIRONMENT = 'test';
  });

  afterEach(() => {
    delete process.env.ENVIRONMENT;
  });

  it('should return 200 status with users list', async () => {
    const event = createMockEvent();
    const context = createMockContext();

    const result = await handler(event, context) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(result.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Request-ID': 'test-aws-request-id',
        'Cache-Control': 'max-age=300'
      })
    );

    const body = JSON.parse(result.body);
    expect(body).toEqual(
      expect.objectContaining({
        users: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            email: expect.any(String),
            createdAt: expect.any(String)
          })
        ]),
        count: expect.any(Number),
        requestId: 'test-request-id'
      })
    );
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should return exactly 3 mock users', async () => {
    const event = createMockEvent();
    const context = createMockContext();

    const result = await handler(event, context) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.count).toBe(3);
    expect(body.users).toHaveLength(3);
  });

  it('should return users with correct structure', async () => {
    const event = createMockEvent();
    const context = createMockContext();

    const result = await handler(event, context) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    const expectedUsers = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: '2024-01-15T10:30:00Z'
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        createdAt: '2024-01-16T14:45:00Z'
      },
      {
        id: '3',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        createdAt: '2024-01-17T09:15:00Z'
      }
    ];

    expect(body.users).toEqual(expectedUsers);
  });

  it('should handle different paths correctly', async () => {
    const event = createMockEvent({ path: '/users/list' });
    const context = createMockContext();

    const result = await handler(event, context) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    // Users endpoint should work regardless of the exact path
    const body = JSON.parse(result.body);
    expect(body.users).toHaveLength(3);
  });

  it('should include correlation tracking in response', async () => {
    const event = createMockEvent();
    const context = createMockContext();

    const result = await handler(event, context) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(result.headers).toEqual(
      expect.objectContaining({
        'X-Request-ID': 'test-aws-request-id'
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

  it('should include cache control headers', async () => {
    const event = createMockEvent();
    const context = createMockContext();

    const result = await handler(event, context) as APIGatewayProxyResult;

    expect(result.headers).toEqual(
      expect.objectContaining({
        'Cache-Control': 'max-age=300'
      })
    );
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
      expect(body.users).toHaveLength(3);
      expect(body.count).toBe(3);
    });
  });

  describe('Mock Data Simulation', () => {
    it('should simulate database latency with timeout', async () => {
      const event = createMockEvent();
      const context = createMockContext();

      const startTime = Date.now();
      const result = await handler(event, context) as APIGatewayProxyResult;
      const endTime = Date.now();

      expect(result.statusCode).toBe(200);
      // Should take at least 50ms due to simulated database latency
      expect(endTime - startTime).toBeGreaterThanOrEqual(50);
    });
  });
});