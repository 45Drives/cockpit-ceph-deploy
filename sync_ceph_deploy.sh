TEST_SERVER_A="192.168.30.51"
COCKPIT_MODULE="ceph-deploy"

# Test Server A
echo "Stopping Cockpit on $TEST_SERVER_A..."
ssh root@$TEST_SERVER_A "systemctl stop cockpit.socket"

#echo "copying local state and parameter files"
#ssh root@$TEST_SERVER_A "cp -a /usr/share/cockpit/$COCKPIT_MODULE/params /root/params"
#ssh root@$TEST_SERVER_A "cp -a /usr/share/cockpit/$COCKPIT_MODULE/state /root/state"

echo "Removing cockpit module ($COCKPIT_MODULE) from $TEST_SERVER_A..."
ssh root@$TEST_SERVER_A "rm -rf /usr/share/cockpit/$COCKPIT_MODULE"

echo "updating $COCKPIT_MODULE on $TEST_SERVER_A using rsync..."
rsync -avh ./src/fakeroot/usr/share/cockpit/$COCKPIT_MODULE root@$TEST_SERVER_A:/usr/share/cockpit/

echo "Making state and param directories"
ssh root@$TEST_SERVER_A "mkdir /usr/share/cockpit/ceph-deploy/state"
ssh root@$TEST_SERVER_A "mkdir /usr/share/cockpit/ceph-deploy/params"

#echo "Moving state and param files back"
#ssh root@$TEST_SERVER_A "cp -a /root/state /usr/share/cockpit/ceph-deploy/"
#ssh root@$TEST_SERVER_A "cp -a /root/params /usr/share/cockpit/ceph-deploy/"

#echo "Deleting temporary state and param files"
#ssh root@$TEST_SERVER_A "rm -rf /root/state"
#ssh root@$TEST_SERVER_A "rm -rf /root/params"

echo "Restarting Cockpit on $TEST_SERVER_A..."
ssh root@$TEST_SERVER_A "systemctl start --now cockpit.socket"
