# Dockerfile pour le Backend Spring Boot
FROM maven:3.9-eclipse-temurin-17 AS build

# Copier les fichiers du projet
WORKDIR /app
COPY pom.xml .
COPY src ./src

# Compiler l'application (skip tests pour accélérer)
RUN mvn clean package -DskipTests

# Image finale légère
FROM eclipse-temurin:17-jre-alpine

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copier le JAR compilé
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Exposer le port 8081
EXPOSE 8081

# Démarrer l'application
ENTRYPOINT ["java", "-jar", "app.jar"]
