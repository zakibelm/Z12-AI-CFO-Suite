#!/bin/bash
# ============================================================
# Z12 AI CFO — setup.sh
# Deploiement sur VPS vierge en moins de 15 minutes
# Teste sur : Ubuntu 22.04 LTS, Ubuntu 24.04 LTS
# Prerequis : 2 vCPU / 4GB RAM / 40GB SSD
# ============================================================
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'
YELLOW='\033[1;33m'; BLUE='\033[0;34m'
NC='\033[0m'
ok()   { echo -e "${GREEN}OK $1${NC}"; }
warn() { echo -e "${YELLOW}WARN $1${NC}"; }
err()  { echo -e "${RED}ERR $1${NC}"; exit 1; }
info() { echo -e "${BLUE}-> $1${NC}"; }

clear
echo "=========================================="
echo "   Z12 AI CFO -- Setup v1.0"
echo "   Duree estimee : 10-15 minutes"
echo "=========================================="
echo ""
START_TIME=$(date +%s)

# -- 1. Verification prerequis --------------------------------
info "Etape 1/6 -- Verification prerequis..."
if ! grep -q "Ubuntu" /etc/os-release 2>/dev/null; then
    warn "Script teste sur Ubuntu uniquement. Continuer ? (o/N)"
        read -r CONTINUE
            [[ "$CONTINUE" != "o" && "$CONTINUE" != "O" ]] && err "Abandon."
            fi
            RAM_GB=$(free -g | awk '/^Mem:/{print $2}')
            if [ "$RAM_GB" -lt 2 ]; then
                warn "RAM disponible : ${RAM_GB}GB -- minimum recommande 4GB"
                fi
                if ! command -v docker &>/dev/null; then
                    info "Docker non trouve -- installation en cours..."
                        curl -fsSL https://get.docker.com | sh
                            systemctl enable docker && systemctl start docker
                                ok "Docker installe"
                                else
                                    ok "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
                                    fi
                                    if ! docker compose version &>/dev/null; then
                                        info "Docker Compose plugin non trouve -- installation..."
                                            apt-get update -qq
                                                apt-get install -y -qq docker-compose-plugin
                                                    ok "Docker Compose installe"
                                                    else
                                                        ok "Docker Compose $(docker compose version --short)"
                                                        fi
                                                        for PORT in 80 443 8000 5432; do
                                                            if ss -tlnp 2>/dev/null | grep -q ":${PORT} "; then
                                                                    err "Port ${PORT} deja utilise. Liberer le port et relancer."
                                                                        fi
                                                                        done
                                                                        ok "Ports 80, 443, 8000, 5432 disponibles"

                                                                        # -- 2. Configuration .env ------------------------------------
                                                                        echo ""
                                                                        info "Etape 2/6 -- Configuration de votre instance..."
                                                                        echo ""
                                                                        if [ ! -f ".env.example" ]; then
                                                                            err ".env.example introuvable. Lancer setup.sh depuis le dossier du projet."
                                                                            fi
                                                                            cp .env.example .env
                                                                            ask() {
                                                                                local PROMPT="$1"; local VAR_NAME="$2"; local SECRET="${3:-false}"; local VALUE=""
                                                                                    while [ -z "$VALUE" ]; do
                                                                                            if [ "$SECRET" = "true" ]; then
                                                                                                        read -s -p "  $PROMPT : " VALUE; echo ""
                                                                                                                else
                                                                                                                            read -p "  $PROMPT : " VALUE
                                                                                                                                    fi
                                                                                                                                            [ -z "$VALUE" ] && warn "Ce champ est obligatoire."
                                                                                                                                                done
                                                                                                                                                    eval "$VAR_NAME='$VALUE'"
                                                                                                                                                    }
                                                                                                                                                    ask "Nom de votre cabinet / entreprise" COMPANY_NAME
                                                                                                                                                    ask "Email administrateur" ADMIN_EMAIL
                                                                                                                                                    ask "Mot de passe administrateur (min 12 car.)" ADMIN_PASSWORD true
                                                                                                                                                    ask "Cle OpenRouter (sk-or-v1-...)" OPENROUTER_KEY true
                                                                                                                                                    ask "Votre domaine ou IP publique (ex: cfo.moncabinet.com)" DOMAIN
                                                                                                                                                    if echo "$DOMAIN" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
                                                                                                                                                        ORIGINS="http://${DOMAIN},http://localhost:3000"
                                                                                                                                                        else
                                                                                                                                                            ORIGINS="https://${DOMAIN},http://localhost:3000"
                                                                                                                                                            fi
                                                                                                                                                            info "Generation des secrets cryptographiques..."
                                                                                                                                                            JWT_SECRET=$(openssl rand -hex 32)
                                                                                                                                                            POSTGRES_PASSWORD=$(openssl rand -hex 16)
                                                                                                                                                            SECRET_KEY=$(openssl rand -hex 32)
                                                                                                                                                            ok "Secrets generes"
                                                                                                                                                            sed -i "s|COMPANY_NAME=.*|COMPANY_NAME=${COMPANY_NAME}|" .env
                                                                                                                                                            sed -i "s|ADMIN_EMAIL=.*|ADMIN_EMAIL=${ADMIN_EMAIL}|" .env
                                                                                                                                                            sed -i "s|ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${ADMIN_PASSWORD}|" .env
                                                                                                                                                            sed -i "s|OPENROUTER_API_KEY=.*|OPENROUTER_API_KEY=${OPENROUTER_KEY}|" .env
                                                                                                                                                            sed -i "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env
                                                                                                                                                            sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|" .env
                                                                                                                                                            sed -i "s|SECRET_KEY=.*|SECRET_KEY=${SECRET_KEY}|" .env
                                                                                                                                                            sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=${ORIGINS}|" .env
                                                                                                                                                            sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://ai_cfo:${POSTGRES_PASSWORD}@db:5432/ai_cfo_db|" .env
                                                                                                                                                            ok "Fichier .env configure"
                                                                                                                                                            
                                                                                                                                                            # -- 3. Telechargement de l'image ----------------------------
                                                                                                                                                            echo ""
                                                                                                                                                            info "Etape 3/6 -- Telechargement de l'image Z12 AI CFO..."
                                                                                                                                                            docker compose pull 2>&1 | tail -5
                                                                                                                                                            ok "Image telechargee"
                                                                                                                                                            
                                                                                                                                                            # -- 4. Demarrage des services --------------------------------
                                                                                                                                                            echo ""
                                                                                                                                                            info "Etape 4/6 -- Demarrage des services..."
                                                                                                                                                            docker compose up --build -d
                                                                                                                                                            info "Initialisation en cours (max 60s)..."
                                                                                                                                                            TIMEOUT=60; ELAPSED=0
                                                                                                                                                            while [ $ELAPSED -lt $TIMEOUT ]; do
                                                                                                                                                                BACKEND_STATUS=$(docker compose ps backend --format json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('Health',''))" 2>/dev/null || echo "")
                                                                                                                                                                    if [ "$BACKEND_STATUS" = "healthy" ]; then break; fi
                                                                                                                                                                        sleep 3; ELAPSED=$((ELAPSED + 3)); echo -n "."
                                                                                                                                                                        done
                                                                                                                                                                        echo ""
                                                                                                                                                                        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null || echo "000")
                                                                                                                                                                        if [ "$HTTP_STATUS" != "200" ]; then
                                                                                                                                                                            warn "Backend ne repond pas encore -- attente 30s..."
                                                                                                                                                                                sleep 30
                                                                                                                                                                                    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null || echo "000")
                                                                                                                                                                                        [ "$HTTP_STATUS" != "200" ] && err "Backend ne repond pas (HTTP $HTTP_STATUS). Verifier : docker compose logs backend"
                                                                                                                                                                                        fi
                                                                                                                                                                                        ok "Backend operationnel (HTTP 200)"
                                                                                                                                                                                        
                                                                                                                                                                                        # -- 5. Creation du compte admin ------------------------------
                                                                                                                                                                                        echo ""
                                                                                                                                                                                        info "Etape 5/6 -- Creation du compte administrateur..."
                                                                                                                                                                                        docker compose exec -T backend python3 << PYEOF
                                                                                                                                                                                        import sys
                                                                                                                                                                                        sys.path.insert(0, '/app')
                                                                                                                                                                                        try:
                                                                                                                                                                                            from auth import create_user_if_not_exists
                                                                                                                                                                                                create_user_if_not_exists('${ADMIN_EMAIL}', '${ADMIN_PASSWORD}', role='admin')
                                                                                                                                                                                                    print('Admin cree')
                                                                                                                                                                                                    except Exception as e:
                                                                                                                                                                                                        print(f'Note: {e}')
                                                                                                                                                                                                        PYEOF
                                                                                                                                                                                                        ok "Compte admin configure"
                                                                                                                                                                                                        
                                                                                                                                                                                                        # -- 6. Rapport final -----------------------------------------
                                                                                                                                                                                                        END_TIME=$(date +%s)
                                                                                                                                                                                                        DURATION=$((END_TIME - START_TIME))
                                                                                                                                                                                                        SERVER_IP=$(curl -s https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
                                                                                                                                                                                                        echo ""
                                                                                                                                                                                                        echo "=========================================="
                                                                                                                                                                                                        echo "   Z12 AI CFO -- Deploiement reussi"
                                                                                                                                                                                                        echo "=========================================="
                                                                                                                                                                                                        echo ""
                                                                                                                                                                                                        echo "  Duree         : ${DURATION}s"
                                                                                                                                                                                                        echo "  URL           : http://${SERVER_IP}"
                                                                                                                                                                                                        echo "  Email         : ${ADMIN_EMAIL}"
                                                                                                                                                                                                        echo "  Mot de passe  : [celui que vous avez saisi]"
                                                                                                                                                                                                        echo ""
                                                                                                                                                                                                        echo "  Actions recommandees :"
                                                                                                                                                                                                        echo "  1. Configurer HTTPS : certbot --nginx -d ${DOMAIN}"
                                                                                                                                                                                                        echo "  2. Changer le mot de passe au premier login"
                                                                                                                                                                                                        echo "  3. Sauvegarder votre .env dans un endroit securise"
                                                                                                                                                                                                        echo ""
                                                                                                                                                                                                        echo "  Commandes utiles :"
                                                                                                                                                                                                        echo "  Statut  : docker compose ps"
                                                                                                                                                                                                        echo "  Logs    : docker compose logs -f backend"
                                                                                                                                                                                                        echo "  Update  : ./update.sh"
                                                                                                                                                                                                        echo "  Arret   : docker compose down"
                                                                                                                                                                                                        echo ""
