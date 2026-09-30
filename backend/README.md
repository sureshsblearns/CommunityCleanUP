# community-cleanup-backend

Spring Boot 3.5 / Java 21 REST API for the Community Clean-Up Portal. See the [root README](../README.md) for the
full guide.

```bash
cp .env.example .env            # set DB_PASSWORD and JWT_SECRET
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run
./mvnw test                     # unit + integration tests (H2, no MySQL needed)
./mvnw clean package            # target/community-cleanup-backend.jar
```

- Swagger UI: http://localhost:8080/swagger-ui.html
- Health: http://localhost:8080/actuator/health
- Profiles: `dev` (default; demo seed, local upload fallback) and `prod` (requires `JWT_SECRET` and Cloudinary)

| Package | Responsibility |
|---|---|
| `controller` | HTTP mapping only |
| `service` | Business rules (report workflow, events, rewards, certificates, gallery, analytics, email) |
| `service.storage` | Cloudinary signed uploads, development local-disk fallback, image validation |
| `repository` | Spring Data JPA repositories and aggregation queries |
| `entity` | JPA entities and enums (the report state machine lives in `ReportStatus`) |
| `dto` / `mapper` | API contracts; entities are never serialised |
| `security` | JWT service + filter, principal, JSON 401/403 handlers |
| `config` | Security/CORS, OpenAPI, storage selection, demo data seeding |
| `exception` | `ApiException` + global handler producing the standard error envelope |
