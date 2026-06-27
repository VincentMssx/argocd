pipeline {
    agent any
    environment {
        DOCKER_HUB_USER = 'docker-user'
        APP_NAME        = 'my-react-app'
        MANIFEST_REPO   = 'github.com/github-user/app-manifests.git'
    }
    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }
        stage('Build and Push Docker Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'docker-hub-credentials', 
                                                 usernameVariable: 'DH_USER', 
                                                 passwordVariable: 'DH_PASSWORD')]) {
                    sh "docker login -u \$DH_USER -p \$DH_PASSWORD"
                    sh "docker build -t \$DOCKER_HUB_USER/\$APP_NAME:v${BUILD_NUMBER} ."
                    sh "docker push \$DOCKER_HUB_USER/\$APP_NAME:v${BUILD_NUMBER}"
                }
            }
        }
        stage('Clone and Update Manifests') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'github-credentials', 
                                                 usernameVariable: 'GIT_USER', 
                                                 passwordVariable: 'GIT_TOKEN')]) {
                    sh "git clone https://\$GIT_USER:\$GIT_TOKEN@\$MANIFEST_REPO manifests"
                    dir('manifests') {
                        // Use sed to update values.yaml with the new container version tag
                        sh "sed -i 's/tag: .*/tag: "v${BUILD_NUMBER}"/g' my-react-app/values.yaml"
                        sh "git config user.name 'Jenkins CI'"
                        sh "git config user.email 'jenkins@local.cluster'"
                        sh "git add ."
                        sh "git commit -m 'ci: update my-react-app to v${BUILD_NUMBER}'"
                        sh "git push origin main"
                    }
                }
            }
        }
    }
}