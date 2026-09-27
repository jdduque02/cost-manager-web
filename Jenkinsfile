pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'sprig-web'
        DOCKER_TAG = "${env.BUILD_NUMBER}"
        SONARQUBE_ENV = 'SonarQubeServer' // Nombre configurado en Jenkins
        // SSR real (srvx) para la imagen Docker — el navegador llama a esta URL
        // directo, no hay proxy nginx de por medio. Ajusta según el host/VM destino.
        VITE_API_URL = 'http://localhost:3000/api/v1'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup pnpm') {
            steps {
                sh 'corepack enable'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'pnpm install --frozen-lockfile'
            }
        }

        stage('Lint') {
            steps {
                sh 'pnpm run lint'
            }
        }

        stage('Run Tests') {
            steps {
                sh 'pnpm run test:coverage'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv("${SONARQUBE_ENV}") {
                    withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                        sh 'pnpm dlx sonar-scanner -Dsonar.token=$SONAR_TOKEN'
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build --build-arg VITE_API_URL=${VITE_API_URL} -t ${DOCKER_IMAGE}:${DOCKER_TAG} -t ${DOCKER_IMAGE}:latest ."
            }
        }

        stage('Push Docker Image') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
                        docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} $DOCKER_USER/${DOCKER_IMAGE}:${DOCKER_TAG}
                        docker tag ${DOCKER_IMAGE}:latest $DOCKER_USER/${DOCKER_IMAGE}:latest
                        docker push $DOCKER_USER/${DOCKER_IMAGE}:${DOCKER_TAG}
                        docker push $DOCKER_USER/${DOCKER_IMAGE}:latest
                    '''
                }
            }
        }

        stage('Deploy Vercel') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([
                    string(credentialsId: 'vercel-token', variable: 'VERCEL_TOKEN'),
                    string(credentialsId: 'vercel-org-id', variable: 'VERCEL_ORG_ID'),
                    string(credentialsId: 'vercel-project-id-web', variable: 'VERCEL_PROJECT_ID')
                ]) {
                    sh '''
                        npm install -g vercel@latest
                        vercel pull --yes --environment=production --token=$VERCEL_TOKEN
                        vercel build --prod --token=$VERCEL_TOKEN
                        vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN
                    '''
                }
            }
        }
    }

    post {
        success {
            echo '✅ Pipeline ejecutado correctamente'
        }
        failure {
            echo '❌ Pipeline falló'
        }
    }
}
