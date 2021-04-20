/*
    Cockpit Ceph Deploy - A cockpit module for configuring ceph using 45drives Ansible Playbooks.
    Copyright (C) 2021 Mark Hooper <mhooper@45drives.com>
    
    This file is part of Cockpit Ceph Deploy.
    Cockpit Ceph Deploy is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    Cockpit Ceph Deploy is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
    You should have received a copy of the GNU General Public License
    along with Cockpit Ceph Deploy.  If not, see <https://www.gnu.org/licenses/>.
*/

let g_core_params = null;


function show_snackbar_msg(msg_label,msg_content,msg_color,id) {
	var snackbar = document.getElementById(id);
	if(snackbar != null){
		snackbar.innerHTML = msg_label + msg_content;
		snackbar.style.backgroundColor = msg_color;
		snackbar.className = "show";
		setTimeout(function(){ snackbar.className = snackbar.className.replace("show", ""); }, 3000);
	}
  } 

function add_host_request(){
	hostname = document.getElementById("new-hostname-field").value;
	monitor_interface = document.getElementById("new-interface-field").value;
	ip = document.getElementById("new-ip-field").value;
	if(hostname != null && hostname != ""){
		host_request_json = {[hostname]:{"hostname":""}};
		host_request_json[hostname]["hostname"] = hostname;
		host_request_json[hostname]["ip"] = (ip != null) ? ip:"";
		host_request_json[hostname]["monitor_interface"] = (monitor_interface != null) ? monitor_interface:"";
		var spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/core_params","-h",JSON.stringify(host_request_json),"-w"];
		var result_json = null;
		var proc = cockpit.spawn(spawn_args, {superuser: "require"});
		proc.done(function(data) {
			var msg_label = "";
			var msg_content = "";
			var msg_color = "";
			try {
				result_json = JSON.parse(data);
			} catch (e) {
				msg_color = "#bd3030";
				msg_label = "Error:";
				msg_content = "Unexpected return value.";
			}
			if (result_json.hasOwnProperty("success_msg")){
				msg_color = "#20a030";
				msg_label = "Add Host: ";
				msg_content = "Host Added Succcessfully.";
			}else{
				msg_color = "#bd3030";
				msg_label = "Error:";
				msg_content = "Unexpected return value.";
			}
			hide_modal_dialog("add-host-modal");
			get_param_file_content();
			show_snackbar_msg(msg_label,msg_content,msg_color,"add-host-snackbar");
		});
		proc.fail(function(ex, data) {
			document.getElementById("add-host-result-msg").style.display = "block";
			var msg_label = document.getElementById("add-host-result-msg-label");
			msg_label.innerHTML = "Error:";
			var msg_content = document.getElementById("add-host-result-msg-content");
			try {
				result_json = JSON.parse(data);
			} catch (e) {
				msg_content.innerHTML = "Unable to add host";
			}
			if (result_json.hasOwnProperty("error_msg")){
				msg_content.innerHTML = result_json.error_msg;
			}else{
				msg_content.innerHTML = "Unable to add host";
			}
		});
	}
	else{
		return false;
	}

}

function add_host(){
	document.getElementById("add-host-modal-title").innerText = "Add New Host";
	
	let hostname_field = document.getElementById("new-hostname-field");
	let ip_field = document.getElementById("new-ip-field");
	let interface_field = document.getElementById("new-interface-field");
	hostname_field.value = "";
	ip_field.value = "";
	interface_field.value = "";

    show_modal_dialog("add-host-modal");
	hostname_field.addEventListener("input",function(){
		check_name_field("new-hostname-field","new-hostname-field-feedback","continue-add-host","hostname",true)});
	ip_field.addEventListener("input",function(){
		check_ip_field("new-ip-field","new-ip-field-feedback","continue-add-host","ip",false)});
	interface_field.addEventListener("input",function(){
		check_name_field("new-interface-field","new-interface-field-feedback","continue-add-host","monitor_interface",false)});

    document.getElementById("close-add-host").addEventListener("click",function(){ hide_modal_dialog("add-host-modal"); });
    document.getElementById("cancel-add-host").addEventListener("click",function(){ hide_modal_dialog("add-host-modal"); });
    document.getElementById("continue-add-host").addEventListener("click",add_host_request);
	document.getElementById("continue-add-host").innerText = "Add";
}

function check_name_field(name_field_id,feedback_field_id,button_id,label_name,required_flag) {
	var field_text = document.getElementById(name_field_id).value;
	var button = document.getElementById(button_id);
	var info_message = document.getElementById(feedback_field_id);
	info_message.innerText = " ";
	if(field_text.length === 0 && required_flag){
		button.disabled = true;
		info_message.innerText = label_name + " cannot be empty.";
		return false;
	}else if(field_text.length > 0 && !field_text.match(/^[a-z_][a-z0-9_-]*[$]?$/)){
		button.disabled = true;
		var invalid_chars = [];
		if(field_text[0].match(/[^a-z_]/))
			invalid_chars.push("'"+field_text[0]+"'");
		for(let char of field_text.slice(1,-1))
			if(char.match(/[^a-z0-9_-]/))
				invalid_chars.push("'"+char+"'");
		if(field_text[field_text.length - 1].match(/[^a-z0-9_\-$]/))
			invalid_chars.push("'"+field_text[field_text.length - 1]+"'");
		info_message.innerText = label_name + " contains invalid characters: \n" + invalid_chars.join(", ");
		return false;
	}
	button.disabled = false;
	return true;
}

function check_ip_field(field_id,feedback_field_id,button_id,label_name,required_flag) {
	var ip_string = document.getElementById(field_id).value;
	var button = document.getElementById(button_id);
	var info_message = document.getElementById(feedback_field_id);
	info_message.innerText = " ";
	if(ip_string.length === 0 && required_flag){
		button.disabled = true;
		info_message.innerText = label_name + " cannot be empty.";
		return false;
	}else if(ip_string.length > 0 && !validate_ip_address(ip_string)){
		info_message.innerText = label_name + " invalid ip format.";
		button.disabled = true;
		return false;
	}
	button.disabled = false;
	return true;
}

function validate_ip_address(ipaddress) {  
	if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {  
	  return (true)  
	}  
	return (false)  
}  

function show_modal_dialog(id){
    var modal = document.getElementById(id);
	modal.style.display = "block";
}

function hide_modal_dialog(id) {
	var modal = document.getElementById(id);
	modal.style.display = "none";
	document.getElementById("add-host-result-msg").style.display = "none";
	document.getElementById("new-hostname-field").value = "";
}

function update_role_info(hosts_json,roles_json){
	//clear out the role-div element
	let role_div = document.getElementById("role-div");
	if(role_div != null){role_div.innerHTML = "";}

	//create the new role table
	let role_table = document.createElement("table");
	role_table.classList.add("role-table");
	role_table.id = "role-table";

	//create a blank th entry to start then create a header for each role
	let role_table_header_row = document.createElement("tr");
	role_table_header_row.appendChild(document.createElement("th"));
	for (let key of Object.keys(roles_json)){
		let th = document.createElement("th");
		th.innerText = key;
		role_table_header_row.appendChild(th);
	}
	role_table.appendChild(role_table_header_row); //add header row to table

	//create a new row for each host
	for (let host_key of Object.keys(hosts_json)) {
		let role_table_host_row = document.createElement("tr");
		role_table_host_row.id = "role-table-host-row-" + host_key; // eg: id="role-table-host-row-hostname1"
		role_table_host_row.classList.add("role-table-host-row");
		let role_table_host_name = document.createElement("td");
		role_table_host_name.innerText = host_key;
		role_table_host_row.appendChild(role_table_host_name);
		for (let role_key of Object.keys(roles_json)){
			//create a cell and checkbox for each role.
			let role_checkbox_td = document.createElement("td");
			let role_checkbox = document.createElement("input");
			role_checkbox.type = "checkbox";
			role_checkbox.id = role_key + "-" + host_key + "-checkbox"; //eg "osds-hostname1-checkbox"
			if(roles_json[role_key].includes(host_key)){
				// ensure that checkbox is pre-checked if hostname is found in role list.
				role_checkbox.checked = true; 
			}
			role_checkbox_td.appendChild(role_checkbox);
			role_table_host_row.appendChild(role_checkbox_td);
		}
		role_table.appendChild(role_table_host_row); // add row to table
	}
	role_div.appendChild(role_table); // add table to div
}

function update_options_info(options_json){
	let monitor_interface_field = document.getElementById("options-interface-field");
	let cluster_network_field = document.getElementById("options-cluster-network-field");
	let public_network_field = document.getElementById("options-public-network-field");
	let hybrid_cluster_checkbox = document.getElementById("options-hybrid-cluster-checkbox");

	document.getElementById("global-options-btn").disabled = true;

	if(monitor_interface_field && cluster_network_field && public_network_field && hybrid_cluster_checkbox){
		monitor_interface_field.value = options_json["monitor_interface"];
		cluster_network_field.value = options_json["cluster_network"];
		public_network_field.value = options_json["public_network"];
		hybrid_cluster_checkbox.checked = options_json["hybrid_cluster"];

		cluster_network_field.addEventListener("input",function(){
			check_ip_field("options-cluster-network-field","options-cluster-network-field-feedback","global-options-btn","cluster_network",true)});

		public_network_field.addEventListener("input",function(){
			check_ip_field("options-public-network-field","options-public-network-field-feedback","global-options-btn","public_network",false)});
		
		monitor_interface_field.addEventListener("input",function(){
			check_name_field("options-interface-field","options-interface-field-feedback","global-options-btn","monitor_interface",true)});

		hybrid_cluster_checkbox.addEventListener("change",function(){
			document.getElementById("global-options-btn").removeAttribute("disabled")});
	}
}

function get_param_file_content(){
	var core_params = null;
	var spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/core_params","-s"];
	var result_json = null;
	var proc = cockpit.spawn(spawn_args, {superuser: "require"});
	proc.done(function(data) {
		var msg_label = "";
		var msg_content = "";
		var msg_color = "";
		try {
			result_json = JSON.parse(data);
		} catch (e) {
			msg_color = "#bd3030";
			msg_label = "Error:";
			msg_content = "Unexpected return value.";
		}
		if (result_json.hasOwnProperty("success_msg")){
			msg_color = "#20a030";
			msg_label = "Message: ";
			msg_content = result_json.success_msg;
			if(result_json.hasOwnProperty("old_file_content")){
				update_host_info(result_json.old_file_content.hosts);
				update_role_info(result_json.old_file_content.hosts, result_json.old_file_content.roles);
				update_options_info(result_json.old_file_content.options);
				core_params = result_json.old_file_content;
			}
		}else{
			msg_color = "#bd3030";
			msg_label = "Error:";
			msg_content = "Unexpected return value.";
		}
		hide_modal_dialog("add-host-modal");
		show_snackbar_msg(msg_label,msg_content,msg_color,"snackbar");
	});
	proc.fail(function(ex, data) {
		var msg_color = "#bd3030";
		var msg_label = "Error:";
		var msg_content = "Unable to load parameter file.";
		show_snackbar_msg(msg_label,msg_content,msg_color,"snackbar");
	});
}

function remove_host(hostname){
	host_request_json = {[hostname]:{"hostname":{}}};
		host_request_json[hostname]["hostname"] = hostname;
		var spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/core_params","-h",JSON.stringify(host_request_json),"-x"];
		var result_json = null;
		var proc = cockpit.spawn(spawn_args, {superuser: "require"});
		proc.done(function(data) {
			var msg_label = "";
			var msg_content = "";
			var msg_color = "";
			try {
				result_json = JSON.parse(data);
			} catch (e) {
				msg_color = "#bd3030";
				msg_label = "Error:";
				msg_content = "Unexpected return value.";
			}
			if (result_json.hasOwnProperty("success_msg")){
				msg_color = "#20a030";
				msg_label = "Remove Host: ";
				msg_content = result_json.success_msg;
			}else{
				msg_color = "#bd3030";
				msg_label = "Error:";
				msg_content = "Unexpected return value.";
			}
			get_param_file_content();
			show_snackbar_msg(msg_label,msg_content,msg_color,"add-host-snackbar");
		});
		proc.fail(function(ex, data) {
			var msg_label = "Error: ";
			var msg_content = ""
			var msg_color = "#bd3030";
			try {
				result_json = JSON.parse(data);
			} catch (e) {
				msg_content = "Unable to remove host";
			}
			if (result_json.hasOwnProperty("error_msg")){
				msg_content = result_json.error_msg;
			}else{
				msg_content = "Unable to remove host";
			}
			show_snackbar_msg(msg_label,msg_content,msg_color,"add-host-snackbar");
		});
}

function edit_host(hostname,ip,monitor_interface){
	document.getElementById("add-host-modal-title").innerText = "Edit Host";
	
	let hostname_field = document.getElementById("new-hostname-field");
	let ip_field = document.getElementById("new-ip-field");
	let interface_field = document.getElementById("new-interface-field");
	
	hostname_field.value = hostname;
	ip_field.value = ip;
	interface_field.value = monitor_interface;

	show_modal_dialog("add-host-modal");
	hostname_field.addEventListener("input",function(){
		check_name_field("new-hostname-field","new-hostname-field-feedback","continue-add-host","hostname",true)});
	ip_field.addEventListener("input",function(){
		check_ip_field("new-ip-field","new-ip-field-feedback","continue-add-host","ip",false)});
	interface_field.addEventListener("input",function(){
		check_name_field("new-interface-field","new-interface-field-feedback","continue-add-host","monitor_interface",false)});

	document.getElementById("close-add-host").addEventListener("click",function(){ hide_modal_dialog("add-host-modal"); });
	document.getElementById("cancel-add-host").addEventListener("click",function(){ hide_modal_dialog("add-host-modal"); });
	document.getElementById("continue-add-host").addEventListener("click",add_host_request);
	document.getElementById("continue-add-host").innerText = "Save";
}

function update_host_info(hosts_json){
	let host_list = document.getElementById("cd-host-list");
	while (host_list.hasChildNodes()) {  
		host_list.removeChild(host_list.firstChild);
	}
	if(Object.keys(hosts_json).length > 0){	
		for (let key of Object.keys(hosts_json)) {
			let hostname = hosts_json[key]["hostname"];
			let ip = hosts_json[key]["ip"];
			let monitor_interface = hosts_json[key]["monitor_interface"];
			
			var new_host_entry = document.createElement("div");
			new_host_entry.classList.add("cd-host-list-entry");

			var host_entry_hostname = document.createElement("div");
			host_entry_hostname.classList.add("cd-host-list-entry-text");
			host_entry_hostname.innerText = hostname;

			var host_entry_ip = document.createElement("div");
			host_entry_ip.classList.add("cd-host-list-entry-text");
			host_entry_ip.innerText = ip;

			var host_entry_monitor_interface = document.createElement("div");
			host_entry_monitor_interface.classList.add("cd-host-list-entry-text");
			host_entry_monitor_interface.innerText = monitor_interface;

			var host_entry_edit_icon = document.createElement("div");
			host_entry_edit_icon.classList.add("cd-host-list-entry-icon","fa","fa-gear");

			host_entry_edit_icon.addEventListener("click", function(){
				let hns = hostname.valueOf();
				let ips = ip.valueOf();
				let mis = monitor_interface.valueOf();
				edit_host(hns,ips,mis);
			});

			var host_entry_delete_icon = document.createElement("div");
			host_entry_delete_icon.classList.add("cd-host-list-entry-icon-del","fa","fa-times");
			host_entry_delete_icon.addEventListener("click", function(){let arg = hostname.valueOf();remove_host(arg)});

			new_host_entry.appendChild(host_entry_hostname);
			new_host_entry.appendChild(host_entry_ip);
			new_host_entry.appendChild(host_entry_monitor_interface);
			new_host_entry.appendChild(host_entry_edit_icon);
			new_host_entry.appendChild(host_entry_delete_icon);

			host_list.appendChild(new_host_entry);
		}
	}else{
		var placeholder = document.createElement("div");
		placeholder.classList.add("cd-host-list-entry-placeholder");
		placeholder.id = "cd-host-placeholder";
		placeholder.innerText = "No hosts have been configured. Click the \"+New Host\" button to add a new host.";
		host_list.appendChild(placeholder);
	}
}

function hide_step_content(step){
	let id_string = "step-" + step.toString();
	let step_content = document.getElementById(id_string);
	if(step_content != null){step_content.classList.add("hidden");}
}

function show_step_content(step){
	let id_string = "step-" + step.toString();
	let step_content = document.getElementById(id_string);
	if(step_content != null){step_content.classList.remove("hidden");}
}

function update_role_request(){

	// we can update the roles assigned to each host by performing two subsequent requests.
	// we can remove any unchecked roles first, then we can add in all of the checked roles.

	let role_request_template = {
        "mons": [],
        "mgrs": [],
        "osds": [],
        "metrics": [],
        "mdss": [],
        "smbs": [],
        "nfss": [],
        "iscsigws": [],
        "rgws": [],
        "rgwloadbalancers": [],
        "client": []
	}

	let add_role_request_json = {
        "mons": [],
        "mgrs": [],
        "osds": [],
        "metrics": [],
        "mdss": [],
        "smbs": [],
        "nfss": [],
        "iscsigws": [],
        "rgws": [],
        "rgwloadbalancers": [],
        "client": []
	}

	let remove_role_request_json = {
        "mons": [],
        "mgrs": [],
        "osds": [],
        "metrics": [],
        "mdss": [],
        "smbs": [],
        "nfss": [],
        "iscsigws": [],
        "rgws": [],
        "rgwloadbalancers": [],
        "client": []
	}

	//look through the role table and determine the state of each checkbox. 
	let role_table_host_rows = document.getElementsByClassName("role-table-host-row");
	for(let i = 0; i<role_table_host_rows.length; i++){
		// get the hostname from the id string of the tr element.
		let hostname = role_table_host_rows[i].id.substring("role-table-host-row-".length);
		for (let role_key of Object.keys(role_request_template)) {
			//construct the id string of the checkbox: example "mons-hostname1-checkbox"
			let checkbox_id_string = role_key + "-" + hostname + "-checkbox";
			let role_checkbox = document.getElementById(checkbox_id_string);
			if(role_checkbox != null){
				if(role_checkbox.checked){
					// The checkbox is checked, add the hostname to the add_role_request
					add_role_request_json[role_key].push(hostname);
				}else{
					// The checkbox is not checked, add the hostname to the remove_role_request
					remove_role_request_json[role_key].push(hostname);
				}
			}
		}
	}

	// perform the remove request first
	var remove_spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/core_params","-r",JSON.stringify(remove_role_request_json),"-x"];
	var remove_result_json = null;
	var remove_role_proc = cockpit.spawn(remove_spawn_args, {superuser: "require"});
	remove_role_proc.done(function(data) {
		// removal was successful, now perform the add role request.
		var add_spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/core_params","-r",JSON.stringify(add_role_request_json),"-w"];
		var add_result_json = null;
		var add_role_proc = cockpit.spawn(add_spawn_args, {superuser: "require"});
		add_role_proc.done(function(data) {
			show_snackbar_msg("Message: ","Roles have been updated.", "#20a030","update-roles-snackbar");
			get_param_file_content();
		});
		add_role_proc.fail(function(ex, data) {
			console.log("add_role_proc (FAIL): ",data);
			show_snackbar_msg("Error: ","Failed to add role(s)","#bd3030","update-roles-snackbar");
		});
	});
	remove_role_proc.fail(function(ex, data) {
		console.log("remove_role_proc (FAIL): ",data);
		show_snackbar_msg("Error: ","Failed to remove role(s)","#bd3030","update-roles-snackbar");
	});
}

function update_options_request(){

	let options_request_json = {
		"monitor_interface": document.getElementById("options-interface-field").value,
		"cluster_network": document.getElementById("options-cluster-network-field").value,
		"public_network": document.getElementById("options-public-network-field").value,
		"hybrid_cluster": document.getElementById("options-hybrid-cluster-checkbox").checked
	};

	var spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/core_params","-o",JSON.stringify(options_request_json),"-w"];
	var result_json = null;
	var options_proc = cockpit.spawn(spawn_args, {superuser: "require"});
	options_proc.done(function(data){
		show_snackbar_msg("Message: ","Global options have been updated", "#20a030","update-options-snackbar");
		get_param_file_content();
	});
	options_proc.fail(function(ex, data) {
		console.log("options_proc (FAIL): ",data);
		show_snackbar_msg("Error: ","Failed to modify global options","#bd3030","update-roles-snackbar");
	});
}

function generate_host_file(){
	var spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/make_hosts"];
	var result_json = null;
	var generate_host_file_proc = cockpit.spawn(spawn_args, {superuser: "require"});
	generate_host_file_proc.done(function(data){
		let msg_color = "";
		let msg_label = "";
		let msg_content = "";
		try {
			result_json = JSON.parse(data);
		} catch (e) {
			msg_color = "#bd3030";
			msg_label = "Error:";
			msg_content = "Unexpected return value.";
		}
		if (result_json.hasOwnProperty("success_msg")){
			msg_color = "#20a030";
			msg_label = "Message: ";
			msg_content = result_json.success_msg;
			var host_file_content_proc = cockpit.spawn(["cat",result_json.path],{superuser:"require"});
			host_file_content_proc.done(function(data){
				document.getElementById("host-file-content").innerText = data;
			});
			host_file_content_proc.fail(function(ex,data){
				console.log("host_file_content_proc (FAIL): ",data);
			});
		}else{
			msg_color = "#bd3030";
			msg_label = "Error:";
			msg_content = "Unexpected return value.";
		}
		show_snackbar_msg(msg_label,msg_content,msg_color,"snackbar");
	});
}

function main()
{
	let root_check = cockpit.permission({ admin: true });
	root_check.addEventListener(
		"changed", 
		function() {
			if(root_check.allowed){
				//user is an administrator, start the module as normal
                //setup on-click listeners for buttons as required.
				var current_step = Number(localStorage.getItem("current_step")??"0");
				if(current_step === 0){ document.getElementById("prev-step-btn").disabled = true; }

				show_step_content(current_step);
				get_param_file_content();
				
				document.getElementById("new-host-btn").addEventListener("click",add_host);
				document.getElementById("update-roles-btn").addEventListener("click",update_role_request);
				document.getElementById("global-options-btn").addEventListener("click",update_options_request);
				document.getElementById("generate-host-file-btn").addEventListener("click",generate_host_file);

				document.getElementById("next-step-btn").addEventListener("click",() => {
					var next_step = Number(localStorage.getItem("current_step")??"0") + 1;
					var current_step = next_step -1;
					hide_step_content(current_step);
					show_step_content(next_step);
					document.getElementById("prev-step-btn").removeAttribute("disabled");
					localStorage.setItem("current_step",next_step.toString());
				});
				
				document.getElementById("prev-step-btn").addEventListener("click",() => {
					var prev_step = Number(localStorage.getItem("current_step")??"0") == 0 ? 0 : Number(localStorage.getItem("current_step")??"0") - 1;
					var current_step = prev_step +1;
					hide_step_content(current_step);
					show_step_content(prev_step);
					if(prev_step !== 0){document.getElementById("prev-step-btn").removeAttribute("disabled");}
					else{document.getElementById("prev-step-btn").disabled = true;}
					localStorage.setItem("current_step",prev_step.toString());
				});
			}else{
				//user is not an administrator, inform them of this by
				//displaying a message on each tab page. 
				let page_content = document.getElementById("host_configuration_content");
				page_content.innerHTML = "";
				let user_msg = document.createElement("div");
				user_msg.className = "content_block_msg";
				user_msg.innerHTML = "You must be an administrator to use this feature.";
				page_content.appendChild(user_msg);
			}
	 	}
	);
}

main();

cockpit.transport.wait(function() { });