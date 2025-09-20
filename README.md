# Lambda Node.js Template

This template provides a complete setup for AWS Lambda functions written in Node.js, using Terraform for infrastructure management.

## Structure

```
.
├── src/
│   ├── hello/          # Hello Lambda function
│   │   ├── index.js
│   │   └── package.json
│   └── users/          # Users Lambda function
│       ├── index.js
│       └── package.json
├── scripts/
│   ├── build.js        # Build script for all functions
│   └── install-deps.js # Install dependencies script
├── terraform/          # Terraform infrastructure
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── .github/
│   └── workflows/
│       └── build.yml   # GitHub Actions CI/CD
├── package.json        # Root package.json
├── Makefile
└── README.md
```

## Prerequisites

- Node.js 18+
- npm or yarn
- Terraform >= 1.0
- AWS CLI configured
- Make (optional, for using Makefile commands)

## Getting Started

1. **Clone this template**
   ```bash
   git clone <this-repo>
   cd lambda-nodejs-template
   ```

2. **Install dependencies**
   ```bash
   npm install
   npm run install:all
   # or
   make deps install-all
   ```

3. **Build Lambda functions**
   ```bash
   npm run build
   # or
   make build
   ```

4. **Deploy infrastructure**
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   # or
   make deploy
   ```

## Development

### Adding a New Function

1. Create a new directory under `src/` (e.g., `src/orders/`)
2. Add your `index.js` and `package.json` files
3. Add the function to `terraform/main.tf`
4. The build process will automatically detect and build the new function

### Building

```bash
# Build all functions
npm run build
# or
make build

# The build script will:
# - Install production dependencies for each function
# - Create zip packages in the build/ directory
```

### Testing

```bash
# Run tests for all functions
npm test
# or
make test

# Run tests for a specific function
cd src/hello
npm test
```

### Linting

```bash
# Run linter
npm run lint
# or
make lint
```

## CI/CD

The GitHub Actions workflow automatically:
- Detects changed functions
- Builds each function in parallel
- Runs tests and linting
- Performs security audits
- Creates deployment packages
- Uploads build artifacts

## Terraform Configuration

The infrastructure uses:
- **terraform-aws-modules/lambda/aws** for Lambda functions
- **terraform-aws-modules/apigateway-v2/aws** for API Gateway
- Pre-built packages (no building in Terraform)

### Customization

Edit `terraform/variables.tf` to customize:
- AWS region
- Function names
- Environment settings

## API Endpoints

After deployment, you'll get:
- `GET /hello` - Hello function
- `GET /users` - Users function

## Cost Optimization

- Functions use Node.js 18.x runtime
- CloudWatch logs have 14-day retention
- API Gateway uses HTTP API (cheaper than REST API)

## Security

- IAM roles follow least privilege principle
- CloudWatch logs enabled for monitoring
- npm audit security scanning in CI/CD
- Dependency scanning for vulnerabilities