## Cockpit Ceph-Deploy 1.0.5-3

* updated ceph-ansible-45d dependency to version 5.3.4
* modified default templates for all.yml and nfss.yml
* added ceph_nfs_server and mountpoint options when configuring kernel mounted nfs to UI
* set the default nfs configuration to be Active-Passive
* removed ansible dependency, offloading that to ceph-ansible-45d
* removed prerelease flag for latest build