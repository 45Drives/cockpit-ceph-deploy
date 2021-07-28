### Last Updated: 2021-07-28

# cockpit-ceph-deploy (pre-release v0.2.0 and lower)
A cockpit module that deploys ceph on 45Drives Hardware using Ansible Playbooks. 

# Installation 
## Rocky Linux
Perform all steps as root
### Enable to 45drives official repository
```
curl -LO https://repo.45drives.com/setup
chmod +x setup
./setup
```
### Enable the 45drives_testing repo (while cockpit-ceph-deploy is still in pre-release)
```
sed -i 's/enabled = 0/enabled = 1/g' /etc/yum.repos.d/45drives.repo
```
### Install cockpit-ceph-deploy
```
yum install cockpit-ceph-deploy
```

## Ubuntu 20.04.2.0 LTS (Focal Fossa)
Perform all steps as root
### Enable to 45drives official repository
```
wget -q https://repo.45drives.com/setup
chmod +x setup
./setup
```
### Enable the 45drives_testing repo (while cockpit-ceph-deploy is still in pre-release)
```
sed -i 's/Enabled: no/Enabled: yes/g' /etc/apt/sources.list.d/45drives.sources
```
### Install cockpit-ceph-deploy
```
apt install cockpit-ceph-deploy
```




