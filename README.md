# cockpit-ceph-deploy
A cockpit module that deploys Ceph, Samba, NFS, ISCSI and more on 45Drives Hardware using Ansible Playbooks. 
[![Ceph Deploy Tutorial](http://img.youtube.com/vi/ZsQp1vmn22M/0.jpg)](http://www.youtube.com/watch?v=ZsQp1vmn22M)

## Supported Operating Systems
Rocky Linux
Ubuntu 20.04.2.0 LTS (Focal Fossa)

# Installation 
## Rocky Linux
### Enable to 45Drives official repository
https://repo.45drives.com/setup.html

### Install the cockpit-ceph-deploy package on the administrator node  node using dnf
```
dnf install cockpit-ceph-deploy
```

### Enable/Start Cockpit
```
systemctl enable cockpit.service
systemctl start --now cockpit.socket
```

## Ubuntu 20.04.2.0 LTS (Focal Fossa)
### Enable to 45Drives official repository
https://repo.45drives.com/setup.html

### Install the cockpit-ceph-deploy package on the administrator node using apt
```
apt install cockpit-ceph-deploy
```

### Enable/Start Cockpit
```
systemctl enable cockpit.service
systemctl start --now cockpit.socket
```




