import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { Metrics, MetricUnits, logMetrics } from '@aws-lambda-powertools/metrics';
import { getParameter } from '@aws-lambda-powertools/parameters/ssm';

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
    metrics.addMetric('RequestCount', MetricUnits.Count, 1);
    if (success) {
        metrics.addMetric('SuccessCount', MetricUnits.Count, 1);
    } else {
        metrics.addMetric('ErrorCount', MetricUnits.Count, 1);
    }
};

@tracer.captureMethod()
const processRequest = async (event: APIGatewayProxyEvent): Promise<HelloResponse> => {
    // Add trace metadata
    tracer.addAnnotation('path', event.path || '/hello');
    tracer.addMetadata('event', event);

    logger.info('Processing hello request', {
        path: event.path,
        httpMethod: event.httpMethod,
        userAgent: event.headers?.['User-Agent']
    });

    // Example of parameter retrieval (optional)
    let appVersion = 'v1.0.0';
    try {
        // Uncomment if you have SSM parameters
        // appVersion = await getParameter('/lambda-template/version', { maxAge: 300 });
    } catch (error) {
        logger.warn('Could not retrieve version parameter', { error });
    }

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

// Enhanced handler with proper decorators for correlation
export const handler = logMetrics(metrics)(
    captureLambdaHandler(tracer)(
        injectLambdaContext(logger)(
            async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
                // Correlation ID is automatically injected by Powertools
                const correlationId = tracer.getAnnotation('correlationId') || context.awsRequestId;

                // Add correlation to all subsequent logs and traces
                tracer.addAnnotation('correlationId', correlationId);
                tracer.addAnnotation('requestId', context.awsRequestId);
                tracer.addAnnotation('traceId', process.env._X_AMZN_TRACE_ID);

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
            }
        )
    )
);