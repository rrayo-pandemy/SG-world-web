#!/bin/bash

# 🔐 ElRinconAzul Security & Quality Verification Script
# Ejecutar antes de deployar a producción

echo "
████████████████████████████████████████████████████████
█                                                      █
█  🔐 ElRinconAzul SECURITY VERIFICATION 2026          █
█                                                      █
████████████████████████████████████████████████████████
"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

echo ""
echo "1️⃣  VERIFICANDO CONFIGURACIÓN DE ENTORNO"
echo "════════════════════════════════════════"

# Verificar .env
if [ -f "backend/.env" ]; then
    check_pass ".env file exists"
    
    if grep -q "JWT_SECRET" backend/.env; then
        if grep "JWT_SECRET=your-super-secret" backend/.env > /dev/null; then
            check_warn "JWT_SECRET is using default value - MUST change in production"
        else
            check_pass "JWT_SECRET configured"
        fi
    else
        check_fail "JWT_SECRET not set in .env"
    fi
    
    if grep -q "NODE_ENV=production" backend/.env; then
        check_pass "NODE_ENV set to production"
    else
        check_warn "NODE_ENV not set to production"
    fi
    
    if grep -q "MONGODB_URI" backend/.env; then
        check_pass "MONGODB_URI configured"
    else
        check_fail "MONGODB_URI not configured"
    fi
else
    check_fail ".env file not found - copy from .env.example"
fi

echo ""
echo "2️⃣  VERIFICANDO DEPENDENCIAS"
echo "════════════════════════════════════════"

cd backend

if [ ! -d "node_modules" ]; then
    check_warn "node_modules not installed - run: npm install"
else
    check_pass "node_modules exists"
fi

# Verificar vulnerabilidades npm
if command -v npm &> /dev/null; then
    npm_audit=$(npm audit --json 2>/dev/null)
    
    if echo "$npm_audit" | grep -q '"vulnerabilities":{}'; then
        check_pass "No npm vulnerabilities found"
    elif echo "$npm_audit" | grep -q '"critical"'; then
        check_fail "CRITICAL npm vulnerabilities detected - run: npm audit fix"
    elif echo "$npm_audit" | grep -q '"high"'; then
        check_warn "High severity npm vulnerabilities detected"
    else
        check_pass "npm audit passed"
    fi
else
    check_warn "npm not found - cannot check vulnerabilities"
fi

echo ""
echo "3️⃣  VERIFICANDO SEGURIDAD BACKEND"
echo "════════════════════════════════════════"

# Verificar que hay helmet
if grep -q "helmet" backend/server.js; then
    check_pass "Helmet security headers configured"
else
    check_fail "Helmet not found in server.js"
fi

# Verificar CORS
if grep -q "cors" backend/server.js; then
    check_pass "CORS protection configured"
else
    check_fail "CORS not configured"
fi

# Verificar rate limiting
if grep -q "rateLimit" backend/server.js; then
    check_pass "Rate limiting configured"
else
    check_fail "Rate limiting not configured"
fi

# Verificar morgan logging
if grep -q "morgan" backend/server.js; then
    check_pass "Request logging (morgan) configured"
else
    check_warn "Request logging not configured"
fi

# Verificar express-validator
if grep -q "express-validator" package.json; then
    check_pass "Input validation library installed"
else
    check_fail "express-validator not installed"
fi

# Verificar bcryptjs
if grep -q "bcryptjs" package.json; then
    check_pass "Bcryptjs for password hashing installed"
else
    check_fail "bcryptjs not installed"
fi

# Verificar JWT
if grep -q "jsonwebtoken" package.json; then
    check_pass "JWT library installed"
else
    check_fail "JWT library not installed"
fi

echo ""
echo "4️⃣  VERIFICANDO SEGURIDAD FRONTEND"
echo "════════════════════════════════════════"

cd ../frontend

# Verificar que no hay elementos inline script peligrosos
if grep -q "eval(" index.html css/*.css js/*.js 2>/dev/null; then
    check_fail "Found eval() - potential XSS vulnerability"
else
    check_pass "No eval() functions found"
fi

# Verificar HTTPS hints
if grep -q "https://" index.html; then
    check_pass "Using HTTPS URLs in assets"
else
    check_warn "Some assets using HTTP instead of HTTPS"
fi

# Verificar accessibility
if grep -q 'aria-label' index.html; then
    check_pass "ARIA labels found for accessibility"
else
    check_warn "Missing ARIA labels - accessibility may be incomplete"
fi

# Verificar que hay alt text en imágenes
img_count=$(grep -c "<img" index.html)
alt_count=$(grep -c "alt=" index.html)

if [ "$img_count" -eq "$alt_count" ]; then
    check_pass "All images have alt text"
else
    check_warn "$img_count images found, but only $alt_count have alt text"
fi

echo ""
echo "5️⃣  VERIFICANDO CONTROLADORES"
echo "════════════════════════════════════════"

cd ../backend

# Verificar estructura de middleware
if [ -f "middleware/auth.js" ]; then
    check_pass "Authentication middleware exists"
else
    check_fail "Authentication middleware not found"
fi

if [ -f "middleware/validation.js" ]; then
    check_pass "Validation middleware exists"
else
    check_fail "Validation middleware not found"
fi

if [ -f "middleware/errorHandler.js" ]; then
    check_pass "Error handler middleware exists"
else
    check_fail "Error handler middleware not found"
fi

# Verificar modelos
if [ -f "models/User.js" ]; then
    check_pass "User model defined"
else
    check_warn "User model not found"
fi

if [ -f "models/Order.js" ]; then
    check_pass "Order model defined"
else
    check_warn "Order model not found"
fi

echo ""
echo "6️⃣  VERIFICANDO DOCUMENTACIÓN"
echo "════════════════════════════════════════"

cd ../docs

if [ -f "01-ARQUITECTURA.md" ]; then
    check_pass "Architecture documentation found"
else
    check_warn "Architecture documentation missing"
fi

if [ -f "02-SEGURIDAD-ISO9001.md" ]; then
    check_pass "Security documentation found"
else
    check_warn "Security documentation missing"
fi

if [ -f "03-IMPLEMENTACION.md" ]; then
    check_pass "Implementation guide found"
else
    check_warn "Implementation guide missing"
fi

echo ""
echo "7️⃣  VERIFICANDO LOGS Y AUDITORÍA"
echo "════════════════════════════════════════"

if [ -d "logs" ]; then
    check_pass "Logs directory exists"
else
    check_warn "Logs directory not found - will be created at runtime"
fi

echo ""
echo "════════════════════════════════════════"
echo "📊 RESULTADO FINAL"
echo "════════════════════════════════════════"

TOTAL=$((PASSED + FAILED + WARNINGS))

echo -e "${GREEN}✓ Passed:${NC} $PASSED"
echo -e "${RED}✗ Failed:${NC} $FAILED"  
echo -e "${YELLOW}⚠ Warnings:${NC} $WARNINGS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total Checks: $TOTAL"
echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL CHECKS PASSED - READY FOR PRODUCTION${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠  PASSED WITH WARNINGS - REVIEW BEFORE DEPLOYMENT${NC}"
        exit 0
    fi
else
    echo -e "${RED}❌ SOME CHECKS FAILED - FIX BEFORE DEPLOYMENT${NC}"
    exit 1
fi
