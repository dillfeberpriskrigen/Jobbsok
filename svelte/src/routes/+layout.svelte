
<script lang="ts">
import './layout.css';
const { children } = $props();
</script>
<header>
	<center><big>
This is not a test... 
It is a header of a test
</big></center>
<a href=http://localhost:5173/demo/better-auth/login>Login</a>
<a href=http://localhost:5173>Home</a>
<a href=http://localhost:5173/about>About</a>

</header>

{@render children()}

<footer>

The hobbits. In isengard

</footer>

<style>
footer{padding: 20px;
text-align: center;
position:fixed;
bottom:0;
width:100%;}

</style>