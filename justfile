default:
    just --list

clean:
    rm -rf ./bin

compile:
    tsc

run:
    npm run dev

cleanbuild:
    just clean
    just compile

cleanrun:
    just cleanbuild
    node .

docker-dev:
    npm run write-package-version
    docker compose -f docker-compose.dev.yml up --build

docker-prod:
    npm run write-package-version
    docker compose -f docker-compose.prod.yml up -d --build