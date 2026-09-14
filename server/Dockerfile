# Build stage
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app

# 配置 Maven 镜像加速
COPY .mvn/settings.xml /root/.m2/settings.xml

COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
# 跳过测试编译和执行
RUN mvn package -Dmaven.test.skip=true -B

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -g 1001 -S spring && adduser -S app -u 1001
USER app

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:8080/api/v1/health || exit 1

ENTRYPOINT ["java", "-XX:+UseZGC", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
