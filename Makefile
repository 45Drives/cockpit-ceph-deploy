all:

install:
	mkdir -p $(DESTDIR)/usr/share/cockpit/ceph-deploy
	cp -r src/fakeroot/usr/share/cockpit/ceph-deploy/* $(DESTDIR)/usr/share/cockpit/ceph-deploy

uninstall:
	rm -rf $(DESTDIR)/usr/share/cockpit/ceph-deploy