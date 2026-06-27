pipeline {
    agent any
    environment {
        DOCKER_HUB_USER = 'your-dockerhub-username' // Change this!
        APP_NAME        = 'my-react-app'
        // Since code and manifests are in the SAME repo now, we don't need a separate CLONE stage
    }
    stages {
        stage('Build and Push Docker Image') {
            steps {
                script {
                    // Use the BUILD_NUMBER as a unique tag
                    def imageTag = "v${env.BUILD_NUMBER}"
                    
                    withCredentials([usernamePassword(credentialsId: 'docker-hub-credentials', 
                                                     usernameVariable: 'DH_USER', 
                                                     passwordVariable: 'DH_PASSWORD')]) {
                        sh "docker login -u $DH_USER -p $DH_PASSWORD"
                        // BUILD context is the 'app' folder
                        sh "docker build -t ${DOCKER_HUB_USER}/${APP_NAME}:${imageTag} ./app"
                        sh "docker push ${DOCKER_HUB_USER}/${APP_NAME}:${imageTag}"
                    }
                }
            }
        }
        stage('Update Manifests') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'github-credentials', 
                                                 usernameVariable: 'GIT_USER', 
                                                 passwordVariable: 'GIT_TOKEN')]) {
                    script {
                        def imageTag = "v${env.BUILD_NUMBER}"
                        
                        // 1. Update the tag in deploy/values.yaml
                        // This searches for 'tag: ...' and replaces it
                        sh "sed -i 's/tag: .*/tag: ${imageTag}/g' deploy/values.yaml"
                        
                        // 2. Push changes back to GitHub
                        sh "git config user.name 'jenkins-bot'"
                        sh "git config user.email 'jenkins@yourdomain.com'"
                        sh "git add deploy/values.yaml"
                        sh "git commit -m 'ci: update image tag to ${imageTag}'"
                        
                        // Use the token to push back to the repo
                        sh "git push https://${GIT_USER}:${GIT_TOKEN}@github.com/VincentMssx/argocd.git main"
                    }
                }
            }
        }
    }
}