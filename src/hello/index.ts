import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
// import { getParameter } from '@aws-lambda-powertools/parameters/ssm';

// Initialize AWS Powertools
const logger = new Logger({
    serviceName: 'hello-service',
    environment: process.env.ENVIRONMENT || 'dev',
    logLevel: 'INFO'
});

const tracer = new Tracer({
    serviceName: 'hello-service',
    captureHTTPsRequests: true
});

const metrics = new Metrics({
    namespace: 'LambdaTemplate/Hello',
    serviceName: 'hello-service',
    defaultDimensions: {
        environment: process.env.ENVIRONMENT || 'dev'
    }
});

interface HelloResponse {
    message: string;
    path?: string;
    timestamp: string;
    requestId: string;
    version: string;
}

// Add custom business metrics
const addCustomMetrics = (success: boolean): void => {
    metrics.addMetric('RequestCount', MetricUnit.Count, 1);
    if (success) {
        metrics.addMetric('SuccessCount', MetricUnit.Count, 1);
    } else {
        metrics.addMetric('ErrorCount', MetricUnit.Count, 1);
    }
};

const processRequest = async (event: APIGatewayProxyEvent): Promise<HelloResponse> => {
    // Add trace metadata
    tracer.putAnnotation('path', event.path || '/hello');
    tracer.putMetadata('event', event);

    logger.info('Processing hello request', {
        path: event.path,
        httpMethod: event.httpMethod,
        userAgent: event.headers?.['User-Agent']
    });

    // Example of parameter retrieval (optional)
    const appVersion = 'v1.0.0';
    // try {
    //     // Uncomment if you have SSM parameters
    //     // appVersion = await getParameter('/lambda-template/version', { maxAge: 300 });
    // } catch (error) {
    //     logger.warn('Could not retrieve version parameter', { error });
    // }

    const response: HelloResponse = {
        message: 'Hello from TypeScript Lambda with Powertools!',
        path: event.path || '/hello',
        timestamp: new Date().toISOString(),
        requestId: event.requestContext?.requestId || 'unknown',
        version: appVersion
    };

    logger.info('Hello request processed successfully', { response });
    return response;
};

// Enhanced handler
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    // Set correlation ID
    const correlationId = context.awsRequestId;

    // Add correlation to all subsequent logs and traces
    tracer.putAnnotation('correlationId', correlationId);
    tracer.putAnnotation('requestId', context.awsRequestId);
    tracer.putAnnotation('traceId', process.env._X_AMZN_TRACE_ID || '');

    try {
        logger.info('Lambda invocation started', {
            correlationId,
            requestId: context.awsRequestId,
            functionName: context.functionName,
            functionVersion: context.functionVersion,
            remainingTimeMs: context.getRemainingTimeInMillis(),
            traceId: process.env._X_AMZN_TRACE_ID
        });

        const responseData = await processRequest(event);

        addCustomMetrics(true);

        const response: APIGatewayProxyResult = {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                'X-Request-ID': context.awsRequestId,
                'X-Trace-ID': process.env._X_AMZN_TRACE_ID || '',
                'X-Correlation-ID': correlationId
            },
            body: JSON.stringify(responseData, null, 2)
        };

        logger.info('Lambda invocation completed successfully', {
            correlationId,
            statusCode: response.statusCode,
            responseSize: response.body.length
        });

        return response;

    } catch (error) {
        logger.error('Lambda invocation failed', {
            correlationId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });

        addCustomMetrics(false);

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'X-Request-ID': context.awsRequestId,
                'X-Trace-ID': process.env._X_AMZN_TRACE_ID || '',
                'X-Correlation-ID': correlationId
            },
            body: JSON.stringify({
                message: 'Internal server error',
                requestId: context.awsRequestId,
                correlationId,
                timestamp: new Date().toISOString()
            })
        };
    }
};