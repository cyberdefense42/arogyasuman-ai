#!/bin/bash

# HealthScan AI Production Deployment Script
# This script deploys the application with security best practices

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="healthscan-ai"
DEPLOYMENT_USER="healthscan"
LOG_FILE="/var/log/${APP_NAME}-deploy.log"
BACKUP_DIR="/backup/${APP_NAME}"
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking deployment prerequisites..."
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
    fi
    
    # Check required tools
    command -v docker >/dev/null 2>&1 || error "Docker is not installed"
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is not installed"
    command -v openssl >/dev/null 2>&1 || error "OpenSSL is not installed"
    
    # Check environment file
    if [[ ! -f ".env.production" ]]; then
        error "Production environment file (.env.production) not found"
    fi
    
    # Validate environment variables
    source .env.production
    
    required_vars=(
        "DB_PASSWORD"
        "REDIS_PASSWORD" 
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
        "ENCRYPTION_KEY"
        "GRAFANA_PASSWORD"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    log "Prerequisites check completed successfully"
}

# Generate SSL certificates
generate_ssl_certificates() {
    log "Generating SSL certificates..."
    
    SSL_DIR="./ssl"
    mkdir -p "$SSL_DIR"
    
    if [[ ! -f "$SSL_DIR/cert.pem" ]] || [[ ! -f "$SSL_DIR/private.key" ]]; then
        info "Generating self-signed SSL certificate for development/testing"
        openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
            -keyout "$SSL_DIR/private.key" \
            -out "$SSL_DIR/cert.pem" \
            -subj "/C=US/ST=State/L=City/O=HealthScan/CN=localhost"
        
        chmod 600 "$SSL_DIR/private.key"
        chmod 644 "$SSL_DIR/cert.pem"
        
        warn "Using self-signed certificate. Replace with proper SSL certificate for production"
    else
        info "SSL certificates already exist"
    fi
}

# Security hardening
security_hardening() {
    log "Applying security hardening..."
    
    # Set secure file permissions
    find . -type f -name "*.env*" -exec chmod 600 {} \;
    find . -type f -name "*.key" -exec chmod 600 {} \;
    find . -type f -name "docker-compose*.yml" -exec chmod 644 {} \;
    
    # Create secure directories
    sudo mkdir -p /var/log/$APP_NAME
    sudo mkdir -p "$BACKUP_DIR"
    sudo chown -R "$DEPLOYMENT_USER:$DEPLOYMENT_USER" /var/log/$APP_NAME
    sudo chown -R "$DEPLOYMENT_USER:$DEPLOYMENT_USER" "$BACKUP_DIR"
    
    log "Security hardening completed"
}

# Backup existing deployment
backup_deployment() {
    log "Creating backup of existing deployment..."
    
    BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/backup_$BACKUP_TIMESTAMP"
    
    mkdir -p "$BACKUP_PATH"
    
    # Backup database
    if docker ps | grep -q healthscan-postgres; then
        info "Backing up database..."
        docker exec healthscan-postgres pg_dump -U healthscan_user healthscan_prod > "$BACKUP_PATH/database_backup.sql"
    fi
    
    # Backup application data
    if [[ -d "./backend/uploads" ]]; then
        cp -r ./backend/uploads "$BACKUP_PATH/"
    fi
    
    # Backup logs
    if [[ -d "./backend/logs" ]]; then
        cp -r ./backend/logs "$BACKUP_PATH/"
    fi
    
    log "Backup created at $BACKUP_PATH"
}

# Security scan
security_scan() {
    log "Running security scans..."
    
    # Docker image security scan
    if command -v docker-scout >/dev/null 2>&1; then
        info "Scanning Docker images for vulnerabilities..."
        docker scout cves --format sarif --output security-report.sarif healthscan-backend:latest || warn "Docker Scout scan failed"
    fi
    
    # Node.js security audit
    cd backend
    npm audit --audit-level=moderate || warn "NPM audit found vulnerabilities"
    cd ..
    
    # Check for secrets in code
    if command -v git-secrets >/dev/null 2>&1; then
        info "Scanning for secrets in code..."
        git secrets --scan || warn "Git secrets scan found potential issues"
    fi
    
    log "Security scan completed"
}

# Deploy application
deploy_application() {
    log "Deploying HealthScan AI application..."
    
    # Pull latest changes (if using git deployment)
    if [[ -d ".git" ]]; then
        info "Pulling latest changes..."
        git pull origin main
    fi
    
    # Build and start services
    info "Building and starting Docker services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    info "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    services=("healthscan-postgres" "healthscan-redis" "healthscan-backend" "healthscan-frontend")
    
    for service in "${services[@]}"; do
        if docker ps --filter "name=$service" --filter "status=running" | grep -q "$service"; then
            log "✅ $service is running"
        else
            error "❌ $service failed to start"
        fi
    done
    
    # Run database migrations
    info "Running database migrations..."
    docker exec healthscan-backend npm run db:migrate
    
    log "Application deployment completed successfully"
}

# Health checks
run_health_checks() {
    log "Running post-deployment health checks..."
    
    # API health check
    if curl -f -s http://localhost:8080/health > /dev/null; then
        log "✅ Backend API is healthy"
    else
        error "❌ Backend API health check failed"
    fi
    
    # Frontend health check
    if curl -f -s http://localhost:3000 > /dev/null; then
        log "✅ Frontend is healthy"
    else
        error "❌ Frontend health check failed"
    fi
    
    # Database connectivity
    if docker exec healthscan-postgres pg_isready -U healthscan_user > /dev/null; then
        log "✅ Database is healthy"
    else
        error "❌ Database health check failed"
    fi
    
    # Redis connectivity
    if docker exec healthscan-redis redis-cli ping | grep -q PONG; then
        log "✅ Redis is healthy"
    else
        error "❌ Redis health check failed"
    fi
    
    log "All health checks passed successfully"
}

# Monitoring setup
setup_monitoring() {
    log "Setting up monitoring and alerting..."
    
    # Start monitoring services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d prometheus grafana
    
    # Wait for Grafana to be ready
    sleep 15
    
    # Check monitoring services
    if curl -f -s http://localhost:9090/-/healthy > /dev/null; then
        log "✅ Prometheus is running"
    else
        warn "❌ Prometheus health check failed"
    fi
    
    if curl -f -s http://localhost:3001/api/health > /dev/null; then
        log "✅ Grafana is running"
    else
        warn "❌ Grafana health check failed"
    fi
    
    info "Monitoring dashboard available at: http://localhost:3001"
    info "Prometheus metrics at: http://localhost:9090"
}

# Cleanup old resources
cleanup() {
    log "Cleaning up old resources..."
    
    # Remove unused Docker images
    docker image prune -f
    
    # Clean old backups (keep last 7 days)
    find "$BACKUP_DIR" -type d -name "backup_*" -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
    
    # Rotate logs
    find /var/log/$APP_NAME -name "*.log" -size +100M -exec gzip {} \; 2>/dev/null || true
    
    log "Cleanup completed"
}

# Main deployment flow
main() {
    log "Starting HealthScan AI production deployment..."
    
    # Check if deployment is already running
    if docker ps | grep -q healthscan-backend; then
        warn "Application appears to be running. Creating backup before proceeding..."
        backup_deployment
    fi
    
    check_prerequisites
    generate_ssl_certificates
    security_hardening
    security_scan
    deploy_application
    run_health_checks
    setup_monitoring
    cleanup
    
    log "🎉 HealthScan AI deployment completed successfully!"
    
    echo
    info "Access your application at:"
    info "  • Frontend: https://localhost (or your domain)"
    info "  • API: https://localhost/api/v1"
    info "  • Monitoring: http://localhost:3001"
    info "  • Metrics: http://localhost:9090"
    echo
    info "Check logs at: $LOG_FILE"
    info "Backups stored in: $BACKUP_DIR"
    echo
    warn "Remember to:"
    warn "  • Replace self-signed SSL certificates with proper ones"
    warn "  • Configure firewall rules"
    warn "  • Set up proper backup scheduling"
    warn "  • Configure external monitoring/alerting"
}

# Error handling
trap 'error "Deployment failed at line $LINENO"' ERR

# Run main function
main "$@"