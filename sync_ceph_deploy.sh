TEST_SERVER_A="ubuntuosd1"
COCKPIT_MODULE="ceph-deploy"

# Test Server A
echo "Stopping Cockpit on $TEST_SERVER_A..."
ssh root@$TEST_SERVER_A "systemctl stop cockpit.socket"

echo "Removing cockpit module ($COCKPIT_MODULE) from $TEST_SERVER_A..."
ssh root@$TEST_SERVER_A "rm -rf /usr/share/cockpit/$COCKPIT_MODULE"

echo "updating $COCKPIT_MODULE on $TEST_SERVER_A using rsync..."
rsync -avh ./src/fakeroot/usr/share/cockpit/$COCKPIT_MODULE root@$TEST_SERVER_A:/usr/share/cockpit/

echo "Making state and param directories"
ssh root@$TEST_SERVER_A "mkdir /usr/share/cockpit/ceph-deploy/state"
ssh root@$TEST_SERVER_A "mkdir /usr/share/cockpit/ceph-deploy/params"

echo "Restarting Cockpit on $TEST_SERVER_A..."
ssh root@$TEST_SERVER_A "systemctl start --now cockpit.socket"
