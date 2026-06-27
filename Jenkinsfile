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
    env:
    - name: DOCKER_HOST
      value: tcp://localhost:2375
  - name: dind
    image: docker:24.0.6-dind
    securityContext:
      privileged: true
    command: ["dockerd-entrypoint.sh"]
    args: ["--tls=false", "--host=tcp://localhost:2375", "--storage-driver=vfs"]
    env:
    - name: DOCKER_TLS_CERTDIR
      value: ""
    resources:
      requests:
        memory: "1Gi"
        cpu: "500m"
    volumeMounts:
    - name: docker-storage
      mountPath: /var/lib/docker
  volumes:
  - name: docker-storage
    emptyDir: {}
'''
        }
    }
    environment {
        DOCKER_HUB_USER = 'vincentmsx'
        APP_NAME        = 'my-react-app'
    }
    stages {
        stage('Build and Push Docker Image') {
            steps {
                script {
                    def imageTag = "v${env.BUILD_NUMBER}"
                    container('docker') {
                        // Attente du démarrage avec affichage des erreurs potentielles
                        sh '''
                            echo "Waiting for Docker daemon to start..."
                            for i in $(seq 1 20); do
                                if docker ps > /dev/null 2>&1; then
                                    echo "Docker is ready!"
                                    exit 0
                                fi
                                sleep 2
                            done
                            echo "ERROR: Docker daemon failed to start"
                            echo "KEEPING POD ALIVE FOR 10 MINUTES TO ALLOW LOG INSPECTION..."
                            sleep 600 
                            exit 1
                        '''
                        
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