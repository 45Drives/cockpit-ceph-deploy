all:

install: 
	mkdir -p $(DESTDIR)/usr/share/cockpit/ceph-deploy/params
	mkdir -p $(DESTDIR)/usr/share/cockpit/ceph-deploy/state
	cp -r src/fakeroot/usr/share/cockpit/ceph-deploy/* $(DESTDIR)/usr/share/cockpit/ceph-deploy
	ln -sf $(DESTDIR)/usr/share/cockpit/ceph-deploy/helper_scripts/ansible_runner /usr/local/bin
	ln -sf $(DESTDIR)/usr/share/cockpit/ceph-deploy/helper_scripts/ansible_runner /usr/bin

uninstall:
	rm -rf $(DESTDIR)/usr/share/cockpit/ceph-deploy