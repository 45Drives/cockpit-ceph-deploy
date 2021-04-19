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
			console.log("Result: ",data);
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