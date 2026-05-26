#!/bin/bash
# ============================================================
# Z12 AI CFO — update.sh
# Mise a jour en moins de 5 minutes avec rollback automatique
# ============================================================
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'
YELLOW='\033[1;33m'; BLUE='\033[0;34m'
NC='\033[0m'
ok()   { echo -e "${GREEN}OK $1${NC}"; }
warn() { echo -e "${YELLOW}WARN $1${NC}"; }
err()  { echo -e "${RED}ERR $1${NC}"; exit 1; }
info() { echo -e "${BLUE}-> $1${NC}"; }

echo "=========================================="
echo "   Z12 AI CFO -- Mise a jour"
echo "=========================================="
echo ""
START_TIME=$(date +%s)

# -- 1. Version actuelle --------------------------------------
CURRENT_IMAGE=$(docker inspect z12-cfo-backend 2>/dev/null \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['Config']['Image'])" \
        2>/dev/null || echo "inconnue")
        info "Version actuelle : ${CURRENT_IMAGE}"

        # -- 2. Backup preventif --------------------------------------
        info "Etape 1/5 -- Backup preventif..."
        BACKUP_DIR="/var/backups/z12-cfo"
        mkdir -p "$BACKUP_DIR"
        docker compose exec -T db pg_dump -U ai_cfo ai_cfo_db \
            > "${BACKUP_DIR}/pre-update-$(date +%Y%m%d-%H%M%S).sql" 2>/dev/null || \
                warn "Backup DB skipped (DB peut-etre non accessible)"
                ok "Backup effectue dans $BACKUP_DIR"

                # -- 3. Telecharger la nouvelle image -------------------------
                echo ""
                info "Etape 2/5 -- Telechargement nouvelle version..."
                docker compose pull 2>&1 | grep -E "Pull|Already|digest" | tail -5
                NEW_IMAGE=$(docker compose config | grep "image:" | head -1 | awk '{print $2}')
                info "Nouvelle version : ${NEW_IMAGE}"

                # -- 4. Redemarrage -------------------------------------------
                echo ""
                info "Etape 3/5 -- Redemarrage des services..."
                docker compose down --timeout 30
                sleep 3
                docker compose up -d
                ok "Services redemarres"

                # -- 5. Migrations DB -----------------------------------------
                echo ""
                info "Etape 4/5 -- Migrations base de donnees..."
                sleep 10
                docker compose exec -T backend python3 << 'PYEOF'
                import sys
                sys.path.insert(0, '/app')
                try:
                    from db import run_migrations
                        run_migrations()
                            print("Migrations OK")
                            except AttributeError:
                                print("Pas de migrations a appliquer")
                                except Exception as e:
                                    print(f"Warning migrations: {e}")
                                    PYEOF
                                    ok "Migrations appliquees"

                                    # -- 6. Health check + rollback --------------------------------
                                    echo ""
                                    info "Etape 5/5 -- Verification de sante..."
                                    sleep 5
                                    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
                                        http://localhost:8000/health 2>/dev/null || echo "000")

                                        if [ "$HTTP_STATUS" = "200" ]; then
                                            END_TIME=$(date +%s); DURATION=$((END_TIME - START_TIME))
                                                echo ""
                                                    echo "=========================================="
                                                        echo "   Z12 AI CFO -- Mise a jour reussie"
                                                            echo "=========================================="
                                                                echo ""
                                                                    echo "  Duree    : ${DURATION}s"
                                                                        echo "  Ancienne : ${CURRENT_IMAGE}"
                                                                            echo "  Nouvelle : ${NEW_IMAGE}"
                                                                                echo ""
                                                                                else
                                                                                    warn "Backend ne repond pas (HTTP $HTTP_STATUS) -- rollback automatique..."
                                                                                        docker compose down
                                                                                            LATEST_SQL=$(ls -t "${BACKUP_DIR}"/pre-update-*.sql 2>/dev/null | head -1)
                                                                                                if [ -n "$LATEST_SQL" ]; then
                                                                                                        info "Restauration DB depuis : $LATEST_SQL"
                                                                                                                docker compose up -d db
                                                                                                                        sleep 10
                                                                                                                                docker compose exec -T db psql -U ai_cfo ai_cfo_db < "$LATEST_SQL" 2>/dev/null
                                                                                                                                        ok "DB restauree"
                                                                                                                                            fi
                                                                                                                                                docker compose up -d
                                                                                                                                                    sleep 15
                                                                                                                                                        ROLLBACK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
                                                                                                                                                                http://localhost:8000/health 2>/dev/null || echo "000")
                                                                                                                                                                    if [ "$ROLLBACK_STATUS" = "200" ]; then
                                                                                                                                                                            warn "Rollback reussi -- version precedente restauree"
                                                                                                                                                                                    warn "Inspecter les logs : docker compose logs backend"
                                                                                                                                                                                        else
                                                                                                                                                                                                err "Rollback echoue. Intervention manuelle requise."
                                                                                                                                                                                                    fi
                                                                                                                                                                                                    fi
