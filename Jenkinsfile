pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: docker
    image: docker:24.0.6-cli
    command: ['cat']
    tty: true
    volumeMounts:
    - name: dockersock
      mountPath: /var/run/docker.sock
  volumes:
  - name: dockersock
    hostPath:
      path: /var/run/docker.sock
'''
        }
    }
    environment {
        DOCKER_HUB_USER = 'vincentmsx' // Votre nom d'utilisateur Docker Hub
        APP_NAME        = 'my-react-app'
    }
    stages {
        stage('Build and Push Docker Image') {
            steps {
                script {
                    def imageTag = "v${env.BUILD_NUMBER}"
                    // On utilise le container 'docker' défini au début
                    container('docker') {
                        withCredentials([usernamePassword(credentialsId: 'docker-hub-credentials', 
                                                         usernameVariable: 'DH_USER', 
                                                         passwordVariable: 'DH_PASSWORD')]) {
                            sh "docker login -u $DH_USER -p $DH_PASSWORD"
                            sh "docker build -t ${DOCKER_HUB_USER}/${APP_NAME}:${imageTag} ./app"
                            sh "docker push ${DOCKER_HUB_USER}/${APP_NAME}:${imageTag}"
                        }
                    }
                }
            }
        }
        stage('Update Manifests') {
            steps {
                // Cette étape n'a pas besoin de Docker, elle utilise l'agent par défaut (jnlp)
                withCredentials([usernamePassword(credentialsId: 'github-credentials', 
                                                 usernameVariable: 'GIT_USER', 
                                                 passwordVariable: 'GIT_TOKEN')]) {
                    script {
                        def imageTag = "v${env.BUILD_NUMBER}"
                        sh "sed -i 's/tag: .*/tag: ${imageTag}/g' deploy/values.yaml"
                        sh "git config user.name 'jenkins-bot'"
                        sh "git config user.email 'jenkins@local.cluster'"
                        sh "git add deploy/values.yaml"
                        sh "git commit -m 'ci: update image tag to ${imageTag}'"
                        sh "git push https://${GIT_USER}:${GIT_TOKEN}@github.com/VincentMssx/argocd.git main"
                    }
                }
            }
        }
    }
}