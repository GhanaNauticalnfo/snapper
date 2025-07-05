# Unified Deployment Workflow Documentation

## Overview

The unified deployment workflow (`deploy-unified.yml`) consolidates the deployment process for all Ghana Waters applications (api, admin, frontend) across all environments (dev, test, prod) into a single, matrix-based workflow.

## Key Features

### 1. **Automatic Branch-Based Deployments**
- **main** → Production (all apps)
- **develop** → Test (all apps)
- **feature/*** → Dev AND Test (all apps)
- **bugfix/*** → Test only (all apps)

### 2. **Manual Deployment Control**
Via `workflow_dispatch`, you can:
- Deploy a specific app or all apps
- Choose the target environment
- Production deployments require explicit confirmation

### 3. **Smart Change Detection**
- Only deploys apps affected by changes (using Nx affected)
- Considers changes in shared libraries
- Manual triggers can override and force deployment

## Usage Examples

### Automatic Deployments (Push Events)

```bash
# Push to main branch - deploys all affected apps to production
git push origin main

# Push to develop branch - deploys all affected apps to test
git push origin develop

# Push to feature branch - deploys all affected apps to dev AND test
git push origin feature/new-feature

# Push to bugfix branch - deploys all affected apps to test only
git push origin bugfix/fix-issue
```

### Manual Deployments (Workflow Dispatch)

1. **Deploy all apps to test environment:**
   - Go to Actions → Unified App Deployment
   - Click "Run workflow"
   - App: (leave empty)
   - Environment: test
   - Run workflow

2. **Deploy only API to dev environment:**
   - Go to Actions → Unified App Deployment
   - Click "Run workflow"
   - App: api
   - Environment: dev
   - Run workflow

3. **Deploy all apps to production:**
   - Go to Actions → Unified App Deployment
   - Click "Run workflow"
   - App: (leave empty)
   - Environment: prod
   - Confirm production: `deploy-to-production`
   - Run workflow

## Migration Strategy

### Phase 1: Testing (Recommended Duration: 1-2 weeks)
1. Keep existing individual workflows active
2. Test unified workflow with manual triggers
3. Monitor deployments and fix any issues

### Phase 2: Gradual Migration (Recommended Duration: 2-3 weeks)
1. Update branch protection rules to use unified workflow status checks
2. Disable individual workflows one environment at a time:
   - Start with dev environment
   - Then test environment
   - Finally production environment

### Phase 3: Cleanup
1. Archive or delete individual workflow files
2. Update documentation to reference only the unified workflow

## Workflow Configuration

### Matrix Strategy
The workflow dynamically generates a deployment matrix based on:
- **Push events**: Branch name determines environments and apps
- **Manual triggers**: User inputs determine what to deploy

### App Configuration
Each app in the matrix includes:
```json
{
  "app": "api|admin|frontend",
  "environment": "dev|test|prod"
}
```

### Domain Naming Convention
- **Production**: `ghanawaters-{app}.ghananautical.info`
- **Non-prod**: `ghanawaters-{environment}-{app}.ghananautical.info`

## Benefits Over Individual Workflows

1. **Reduced Maintenance**: One workflow instead of 9+ individual files
2. **Consistency**: Same deployment logic for all apps/environments
3. **Flexibility**: Easy to add new apps or environments
4. **Better Control**: Centralized configuration and permissions
5. **Clearer Overview**: Single place to see all deployment activity

## Troubleshooting

### Common Issues

1. **"No deployments were executed"**
   - For production: Ensure you typed `deploy-to-production` exactly
   - For push events: Check if your branch matches the configured patterns

2. **Specific app not deploying**
   - Check if the app has actual changes (use Nx affected locally)
   - For manual triggers, ensure the app name is correct

3. **Matrix parsing errors**
   - Check the workflow logs for the exact matrix JSON
   - Ensure no syntax errors in the determine-deployments job

### Debugging Steps

1. Check the "Deployment Summary" in the workflow run
2. Review the matrix output in determine-deployments job
3. Check individual app deployment logs in the deploy job
4. Verify Nx affected detection in the reusable workflow

## Security Considerations

1. **Production Protection**: 
   - Requires explicit confirmation string
   - Only main branch can trigger automatic production deployments

2. **Secrets Management**:
   - All secrets are inherited from the repository
   - No hardcoded values in the workflow

3. **Branch Patterns**:
   - Strict branch naming conventions prevent accidental deployments
   - Feature branches must start with `feature/`
   - Bugfix branches must start with `bugfix/`

## Future Enhancements

1. **Slack/Email Notifications**: Add deployment status notifications
2. **Approval Gates**: Add manual approval for production deployments
3. **Rollback Capability**: Add automated rollback on failure
4. **Performance Metrics**: Add deployment time tracking
5. **Cost Tracking**: Monitor deployment costs per environment

## Comparison with Existing Workflows

| Aspect | Individual Workflows | Unified Workflow |
|--------|---------------------|------------------|
| Number of files | 9+ | 1 |
| Lines of code | ~450 per file | ~200 total |
| Adding new app | Create 3 new files | Update matrix logic |
| Changing deploy logic | Update 9+ files | Update 1 file |
| Overview of deployments | Check multiple workflows | Single workflow history |

## Contact

For questions or issues with the unified workflow:
- Create an issue in the repository
- Tag with `deployment` and `workflow` labels