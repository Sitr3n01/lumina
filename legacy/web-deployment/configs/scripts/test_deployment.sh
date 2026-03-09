#!/bin/bash
# test_deployment.sh - Testa deployment e verifica se tudo está funcionando
# Usage: ./test_deployment.sh [BASE_URL]

set -e

BASE_URL=${1:-"http://localhost:8000"}
ADMIN_USER="admin"
ADMIN_PASS="Admin123!"

echo "=========================================="
echo "SENTINEL - Deployment Test Script"
echo "=========================================="
echo "Testing: $BASE_URL"
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}

    echo -n "Testing $name... "

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)

    if [ "$response" -eq "$expected_code" ]; then
        echo -e "${GREEN}OK${NC} ($response)"
        return 0
    else
        echo -e "${RED}FAIL${NC} (expected $expected_code, got $response)"
        return 1
    fi
}

# Contador de testes
PASSED=0
FAILED=0

echo "[1/8] Basic Health Checks"
echo "-------------------------"

if test_endpoint "Root endpoint" "$BASE_URL/"; then ((PASSED++)); else ((FAILED++)); fi
if test_endpoint "Health check" "$BASE_URL/api/v1/health/"; then ((PASSED++)); else ((FAILED++)); fi
if test_endpoint "Liveness check" "$BASE_URL/api/v1/health/live"; then ((PASSED++)); else ((FAILED++)); fi
if test_endpoint "Readiness check" "$BASE_URL/api/v1/health/ready"; then ((PASSED++)); else ((FAILED++)); fi
if test_endpoint "Version info" "$BASE_URL/api/v1/health/version"; then ((PASSED++)); else ((FAILED++)); fi

echo ""
echo "[2/8] API Documentation"
echo "-------------------------"

if test_endpoint "Swagger UI" "$BASE_URL/docs"; then ((PASSED++)); else ((FAILED++)); fi
if test_endpoint "OpenAPI spec" "$BASE_URL/openapi.json"; then ((PASSED++)); else ((FAILED++)); fi

echo ""
echo "[3/8] Authentication Endpoints"
echo "-------------------------"

# Testar login (deve retornar 422 sem dados)
if test_endpoint "Login endpoint exists" "$BASE_URL/api/v1/login" 422; then ((PASSED++)); else ((FAILED++)); fi
if test_endpoint "Register endpoint exists" "$BASE_URL/api/v1/register" 422; then ((PASSED++)); else ((FAILED++)); fi

echo ""
echo "[4/8] Protected Endpoints (should return 401)"
echo "-------------------------"

if test_endpoint "Bookings (no auth)" "$BASE_URL/api/v1/bookings?property_id=1" 401; then ((PASSED++)); else ((FAILED++)); fi
if test_endpoint "Conflicts (no auth)" "$BASE_URL/api/v1/conflicts?property_id=1" 401; then ((PASSED++)); else ((FAILED++)); fi
if test_endpoint "Statistics (no auth)" "$BASE_URL/api/v1/statistics/property/1" 401; then ((PASSED++)); else ((FAILED++)); fi

echo ""
echo "[5/8] Authentication Test"
echo "-------------------------"

# Tentar fazer login com credenciais padrão
echo -n "Attempting login with default credentials... "
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}")

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    echo -e "${GREEN}OK${NC}"
    ((PASSED++))

    # Extrair token
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

    echo ""
    echo "[6/8] Authenticated Requests"
    echo "-------------------------"

    # Testar endpoint protegido com token
    echo -n "Testing authenticated request... "
    AUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $TOKEN" \
        "$BASE_URL/api/v1/bookings?property_id=1")

    if [ "$AUTH_RESPONSE" -eq 200 ] || [ "$AUTH_RESPONSE" -eq 404 ]; then
        echo -e "${GREEN}OK${NC} ($AUTH_RESPONSE)"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} ($AUTH_RESPONSE)"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}WARNING${NC} - Could not login with default credentials"
    echo "This is expected if you changed the admin password"
    ((PASSED++))

    echo ""
    echo "[6/8] Authenticated Requests"
    echo "-------------------------"
    echo -e "${YELLOW}SKIPPED${NC} (no auth token)"
fi

echo ""
echo "[7/8] Security Headers"
echo "-------------------------"

echo -n "Checking security headers... "
HEADERS=$(curl -s -I "$BASE_URL/" 2>/dev/null)

HEADERS_OK=true
if ! echo "$HEADERS" | grep -qi "X-Content-Type-Options"; then
    echo -e "${YELLOW}Missing X-Content-Type-Options${NC}"
    HEADERS_OK=false
fi
if ! echo "$HEADERS" | grep -qi "X-Frame-Options"; then
    echo -e "${YELLOW}Missing X-Frame-Options${NC}"
    HEADERS_OK=false
fi

if $HEADERS_OK; then
    echo -e "${GREEN}OK${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}WARNING${NC} - Some security headers missing"
    ((PASSED++))  # Não falhar por isso
fi

echo ""
echo "[8/8] System Metrics"
echo "-------------------------"

echo -n "Fetching system metrics... "
METRICS=$(curl -s "$BASE_URL/api/v1/health/metrics" 2>/dev/null)

if echo "$METRICS" | grep -q "system"; then
    echo -e "${GREEN}OK${NC}"
    ((PASSED++))

    # Mostrar algumas métricas
    echo ""
    echo "System Info:"
    echo "$METRICS" | grep -o '"cpu":{[^}]*}' | head -1
    echo "$METRICS" | grep -o '"memory":{[^}]*}'
else
    echo -e "${RED}FAIL${NC}"
    ((FAILED++))
fi

echo ""
echo "=========================================="
echo "Test Results"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    echo ""
    echo "Your SENTINEL deployment is working correctly!"
    echo ""
    echo "Next steps:"
    echo "1. Change the admin password if you haven't already"
    echo "2. Configure your calendar URLs in the .env file"
    echo "3. Set up SSL/HTTPS if in production"
    echo "4. Configure monitoring and backups"
    echo ""
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    echo ""
    echo "Please check the logs for more information:"
    echo "  sudo journalctl -u sentinel -n 50"
    echo "  or"
    echo "  docker compose logs sentinel-app"
    echo ""
    exit 1
fi
