// This is a template file for local development
// The actual environment.local.ts will be auto-generated when you run:
// npm run db:up
//
// DO NOT EDIT environment.local.ts directly as it will be overwritten
// Edit this template if you need to change the structure

export const environment = {
  production: false,
  apiUrl: '/api',
  frontendUrl: 'http://localhost:4200',
  buildTag: 'development',
  keycloak: {
    url: 'http://localhost:8080',
    realm: 'ghanawaters',
    clientId: 'ghanawaters-admin'
  }
};