import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

// Initialize AWS Powertools
const logger = new Logger({
    serviceName: 'users-service',
    environment: process.env.ENVIRONMENT || 'dev',
    logLevel: 'INFO'
});

const tracer = new Tracer({
    serviceName: 'users-service',
    captureHTTPsRequests: true
});

const metrics = new Metrics({
    namespace: 'LambdaTemplate/Users',
    serviceName: 'users-service',
    defaultDimensions: {
        environment: process.env.ENVIRONMENT || 'dev'
    }
});

interface User {
    id: string;
    name: string;
    email: string;
    createdAt: string;
}

interface UsersResponse {
    users: User[];
    count: number;
    timestamp: string;
    requestId: string;
}

// Add custom business metrics
const addCustomMetrics = (userCount: number, success: boolean): void => {
    metrics.addMetric('RequestCount', MetricUnit.Count, 1);
    metrics.addMetric('UserCount', MetricUnit.Count, userCount);

    if (success) {
        metrics.addMetric('SuccessCount', MetricUnit.Count, 1);
    } else {
        metrics.addMetric('ErrorCount', MetricUnit.Count, 1);
    }
};

const getUsersFromDatabase = async (): Promise<User[]> => {
    // Mock users data - in real implementation, you'd fetch from DynamoDB
    const users: User[] = [
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

    // Simulate database latency
    await new Promise(resolve => setTimeout(resolve, 50));

    logger.info('Users retrieved from database', { userCount: users.length });
    tracer.putAnnotation('userCount', users.length);

    return users;
};

const processUsersRequest = async (event: APIGatewayProxyEvent): Promise<UsersResponse> => {
    // Add trace metadata
    tracer.putAnnotation('path', event.path || '/users');
    tracer.putMetadata('event', event);

    logger.info('Processing users request', {
        path: event.path,
        httpMethod: event.httpMethod,
        userAgent: event.headers?.['User-Agent']
    });

    const users = await getUsersFromDatabase();

    const response: UsersResponse = {
        users,
        count: users.length,
        timestamp: new Date().toISOString(),
        requestId: event.requestContext?.requestId || 'unknown'
    };

    logger.info('Users request processed successfully', {
        userCount: users.length,
        requestId: response.requestId
    });

    return response;
};

export const handler = async (
    event: APIGatewayProxyEvent,
    context: Context
): Promise<APIGatewayProxyResult> => {
    // Set correlation ID for tracing
    tracer.putAnnotation('correlationId', context.awsRequestId);

    logger.addContext(context);

    try {
        logger.info('Lambda invocation started', {
            requestId: context.awsRequestId,
            functionName: context.functionName,
            functionVersion: context.functionVersion
        });

        const responseData = await processUsersRequest(event);

        addCustomMetrics(responseData.count, true);

        const response: APIGatewayProxyResult = {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                'X-Request-ID': context.awsRequestId,
                'Cache-Control': 'max-age=300' // Cache for 5 minutes
            },
            body: JSON.stringify(responseData, null, 2)
        };

        logger.info('Lambda invocation completed successfully');
        return response;

    } catch (error) {
        logger.error('Lambda invocation failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });

        addCustomMetrics(0, false);

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'X-Request-ID': context.awsRequestId
            },
            body: JSON.stringify({
                message: 'Internal server error',
                requestId: context.awsRequestId,
                timestamp: new Date().toISOString()
            })
        };
    } finally {
        // Flush metrics
        metrics.publishStoredMetrics();
    }
};