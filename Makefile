all:

install: 
	mkdir -p $(DESTDIR)/usr/share/cockpit/ceph-deploy/{params,state}
	cp -r src/fakeroot/usr/share/cockpit/ceph-deploy/* $(DESTDIR)/usr/share/cockpit/ceph-deploy
	ln -sf /usr/share/cockpit/ceph-deploy/helper_scripts/ansible_runner /usr/local/bin

uninstall:
	rm -rf $(DESTDIR)/usr/share/cockpit/ceph-deploy